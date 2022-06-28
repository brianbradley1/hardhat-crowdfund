// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./Campaign.sol";

// used to deploy instances of the 'Campaign' contract
contract CampaignFactory {
    address payable[] public s_deployedCampaigns;

    function createCampaign(uint256 minimum) public {
        // need to pass in msg.sender to make sure manager set to correct address
        address newCampaign = address(new Campaign(minimum, msg.sender));
        s_deployedCampaigns.push(payable(newCampaign));
    }

    function getDeployedCampaigns()
        public
        view
        returns (address payable[] memory)
    {
        return s_deployedCampaigns;
    }
}