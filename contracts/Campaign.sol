// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

error Campaign__OnlyManager();
error Campaign__ManagerCannotBeAContributor();
error Campaign__ContributionLessThanMinimum();
error Campaign__ReqAmountGreaterThanCampaignBalance();
error Campaign__ReqAmountNotGreaterThanZero();
error Campaign__NotAContributor();
error Campaign__AlreadyApproved();
error Campaign__NotEnoughApprovals();
error Campaign__RequestAlreadyComplete();
error Campaign__TransferFailed();
error Campaign__RequestDoesNotExist();

import "hardhat/console.sol";

contract Campaign {
    struct Request {
        string description;
        uint256 value;
        address payable recipient;
        bool complete;
        uint256 approvalCount;
        mapping(address => bool) approvals;
    }

    // Campaign Variables
    address private immutable i_manager;
    uint256 private immutable i_minimumContribution;
    uint256 private s_numRequests;
    uint256 private s_approversCount;
    mapping(uint256 => Request) private s_requests;
    mapping(address => bool) private s_approvers;

    /* Functions */
    constructor(uint256 minimum, address creator) {
        i_manager = creator;
        i_minimumContribution = minimum;
    }

    function contribute() public payable {
        if (msg.value < i_minimumContribution)
            revert Campaign__ContributionLessThanMinimum();
        
        if (msg.sender == i_manager)
            revert Campaign__ManagerCannotBeAContributor();

        // add check to make sure doesn't increment approver twice for same address
        if (s_approvers[msg.sender] == false) {
            s_approversCount++;
            s_approvers[msg.sender] = true;
        }
    }

    function createRequest(
        string memory _description,
        uint256 _value,
        address payable _recipient
    ) public payable onlyManager {
        // make sure requested value is not greater than campaign balance
        if (_value > (address(this).balance))
            revert Campaign__ReqAmountGreaterThanCampaignBalance();

        if (_value <= 0)
            revert Campaign__ReqAmountNotGreaterThanZero();

        // Since v0.7.1 - if struct contains a mapping, it can be only used in storage
        // Previously mappings were silently skipped in memory - confusing and error prone
        Request storage r = s_requests[s_numRequests++];
        r.description = _description;
        r.value = _value;
        r.recipient = _recipient;
        r.complete = false;
        r.approvalCount = 0;
    }

    // each contributor should be able to call this request
    function approveRequest(uint256 index) public payable {
        Request storage request = s_requests[index];

        // check to make sure request exists before finalizing request
        if (request.recipient == address(0x0))
            revert Campaign__RequestDoesNotExist();

        // make sure caller is a contributor
        if (!s_approvers[msg.sender]) revert Campaign__NotAContributor();

        // make sure contributor has not already approved this request - if so kick out
        if (request.approvals[msg.sender]) revert Campaign__AlreadyApproved();

        // increment approval count
        request.approvalCount++;
        // add contributor to approvals mapping
        request.approvals[msg.sender] = true;
    }

    function finalizeRequest(uint256 index) public onlyManager {
        Request storage request = s_requests[index];

        // check to make sure request exists before finalizing request
        if (request.recipient == address(0x0))
            revert Campaign__RequestDoesNotExist();

        // check at least 50% of people have approved request before finalizing
        if (!(request.approvalCount > (s_approversCount / 2)))
            revert Campaign__NotEnoughApprovals();

        // check request has not already been approved
        if (request.complete) revert Campaign__RequestAlreadyComplete();

        // make sure requested value is not greater than campaign balance
        if (request.value > (address(this).balance))
            revert Campaign__ReqAmountGreaterThanCampaignBalance();

        // send value to recipient who will be the manager
        address payable requestRecipient = request.recipient;
        (bool success, ) = requestRecipient.call{value: request.value}("");
        if (!success) {
            revert Campaign__TransferFailed();
        }
        request.complete = true;
    }

    /** Getter Functions */
    function getRequestCount() public view returns (uint256) {
        return s_numRequests;
    }

    function getRequest(uint256 index)
        public
        view
        returns (
            string memory,
            uint256,
            address,
            bool,
            uint256
        )
    {
        Request storage request = s_requests[index];
        return (
            request.description,
            request.value,
            request.recipient,
            request.complete,
            request.approvalCount
        );
    }

    function getMinimumContribution() public view returns (uint256) {
        return i_minimumContribution;
    }

    function getNumApprovers() public view returns (uint256) {
        return s_approversCount;
    }

    function getApprover(address approver) public view returns (bool) {
        return s_approvers[approver];
    }

    function getManager() public view returns (address) {
        return i_manager;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /* Modifiers */
    modifier onlyManager() {
        if (msg.sender != i_manager) revert Campaign__OnlyManager();
        _;
    }
}
