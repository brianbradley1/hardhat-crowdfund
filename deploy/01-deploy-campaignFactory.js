const { network } = require("hardhat")
//const { developmentChains } = require("../helper-hardhat-config")
require("dotenv").config()
//const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const campaignFactory = await deploy("CampaignFactory", {
    from: deployer,
    args: [],
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: network.config.blockConfirmations || 1,
  })
  log(`campaignFactory deployed at ${campaignFactory.address}`)

  //   if (
  //     !developmentChains.includes(network.name) &&
  //     process.env.ETHERSCAN_API_KEY
  //   ) {
  //     await verify(ourToken.address, [INITIAL_SUPPLY]);
  //   }
}

module.exports.tags = ["all", "campaignFactory"]
