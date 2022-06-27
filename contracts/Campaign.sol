// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// used to deploy instances of the 'Campaign' contract
contract CampaignFactory {
    address payable[] public deployedCampaigns;

    function createCampaign(uint256 minimum) public {
        // need to pass in msg.sender to make sure manager set to correct address
        address newCampaign = address(new Campaign(minimum, msg.sender));
        deployedCampaigns.push(payable(newCampaign));
    }

    function getDeployedCampaigns()
        public
        view
        returns (address payable[] memory)
    {
        return deployedCampaigns;
    }
}

contract Campaign {
    // only declaration - cant instantiate
    // use capital when defining a struct
    struct Request {
        string description;
        uint256 value;
        address recipient;
        bool complete;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    uint256 numRequests;
    mapping(uint256 => Request) public requests;

    address public manager;
    uint256 public minimumContribution;
    mapping(address => bool) public approvers;
    uint256 public approversCount;

    modifier restricted() {
        require(msg.sender == manager);
        _;
    }

    constructor(uint256 minimum, address creator) {
        manager = creator;
        minimumContribution = minimum;
    }

    function contribute() public payable {
        require(msg.value > minimumContribution);

        // add check to make sure doesn't increment approver twice for same address
        if (approvers[msg.sender] == false) {
            approversCount++;
            approvers[msg.sender] = true;
        }
    }

    function createRequest(
        string memory _description,
        uint256 _value,
        address _recipient
    ) public payable restricted {
        // make sure requested value is less than campaign balance
        require(_value <= (address(this).balance));

        // Since v0.7.1 - if struct contains a mapping, it can be only used in storage
        // Previously mappings were silently skipped in memory - confusing and error prone
        Request storage r = requests[numRequests++];
        r.description = _description;
        r.value = _value;
        r.recipient = _recipient;
        r.complete = false;
        r.approvalCount = 0;
    }

    // each contributor should be able to call this request
    function approveRequest(uint256 index) public payable {
        Request storage request = requests[index];

        // make sure caller has contributed
        require(approvers[msg.sender]);

        // make sure contributor has not already approved this request - if so kick out
        require(!request.approvals[msg.sender]);

        // increment approval count
        request.approvalCount++;
        // add contributor to approvals mapping
        request.approvals[msg.sender] = true;
    }

    function finalizeRequest(uint256 index) public restricted {
        Request storage request = requests[index];

        // check at least 50% of people have approved request before finalizing
        require(request.approvalCount > (approversCount / 2));
        // check request has not already been approved
        require(!request.complete);

        // send me to requestor who will be the manager
        payable(request.recipient).transfer(request.value);
        request.complete = true;
    }

    function getSummary()
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            address
        )
    {
        return (
            minimumContribution,
            (address(this).balance),
            numRequests,
            approversCount,
            manager
        );
    }

    function getRequestCount() public view returns (uint256) {
        return numRequests;
    }
}
