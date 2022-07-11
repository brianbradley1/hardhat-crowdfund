const { ethers } = require("hardhat");
//const fs = require("fs");
const fs = require("fs-extra");
const path = require("path");

const FRONT_END_ADDRESSES_FILE_FACTORY =
  "../nextjs-crowdfund/constants/factoryAddresses.json";
const FRONT_END_ABI_FILE_FACTORY =
  "../nextjs-crowdfund/constants/factoryAbi.json";

const CAMPAIGN_ABI =
  "./artifacts/contracts/Campaign.sol/Campaign.json";
const FRONT_END_ABI_FILE_CAMPAIGN =
  "../nextjs-crowdfund/constants/campaignAbi.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    await updateContractAddresses();
    await updateAbi();
    console.log("Updated contract address and abi");
  }
};

async function updateAbi() {
  const campaignFactory = await ethers.getContract("CampaignFactory");
  //console.log(campaignFactory);
  const campaignAbi = fs.readFileSync(CAMPAIGN_ABI);
  //console.log(campaignAbi);

  fs.writeFileSync(
    FRONT_END_ABI_FILE_FACTORY,
    campaignFactory.interface.format(ethers.utils.FormatTypes.json)
  );
  fs.writeFileSync(FRONT_END_ABI_FILE_CAMPAIGN, campaignAbi);
}

async function updateContractAddresses() {
  const campaignFactory = await ethers.getContract("CampaignFactory");
  const chaindId = network.config.chainId.toString();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE_FACTORY, "utf8")
  );
  if (chaindId in currentAddresses) {
    if (!currentAddresses[chaindId].includes(campaignFactory.address)) {
      currentAddresses[chaindId].push(campaignFactory.address);
    }
  } else {
    currentAddresses[chaindId] = [campaignFactory.address];
  }
  fs.writeFileSync(
    FRONT_END_ADDRESSES_FILE_FACTORY,
    JSON.stringify(currentAddresses)
  );
}

module.exports.tags = ["all", "frontend"];
