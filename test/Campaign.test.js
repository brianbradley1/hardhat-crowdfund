const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { abi: campaignAbi } = require("../artifacts/contracts/Campaign.sol/Campaign.json");

let factory, campaignAddress, campaign, deployer, user1, user2;

describe("Campaign Unit Test", function () {
  beforeEach(async () => {
    const { deploy } = deployments;
    const accounts = await getNamedAccounts();
    deployer = accounts.deployer;
    user1 = accounts.user1;
    user2 = accounts.user2;

    // deploy factory contract
    await deployments.fixture(["campaignFactory"]);
    factory = await ethers.getContract("CampaignFactory", deployer);

    const minimumFee = ethers.utils.parseEther("100");
    // create first campaign for testing
    await factory.createCampaign(minimumFee);
    [campaignAddress] = await factory.getDeployedCampaigns();

    campaign = new ethers.Contract(campaignAddress, campaignAbi);
  });

  describe("Campaigns", () => {
    it("deploys a factory and a campaign", () => {
      assert.ok(campaign.address);
      assert.ok(factory.address);
    });

    // it("marks caller as the campaign manager", async () => {
    //   console.log("campaign address  = " + campaign.address);
    //   const manager = await campaign.getManager();
    //   console.log(manager);
    //   //expect(deployer).to.equal(manager);
    // })

    // it("allows people to contribute money and marks them as approvers", async () => {
    //   await campaign.methods.contribute().send({
    //     value: "200",
    //     from: accounts[1],
    //   });
    //   const isContributor = await campaign.methods.approvers(accounts[1]).call();
    //   assert(isContributor);
    // });

    // it("requires a minimum contribution", async () => {
    //   try {
    //     await campaign.methods.contribute().send({
    //       value: "5",
    //       from: accounts[1],
    //     });
    //     assert(false);
    //   } catch (err) {
    //     assert(err);
    //   }
    // });

    // it("allows a manager to create a request", async () => {
    //   const manager = await campaign.methods.manager().call();

    //   await campaign.methods.contribute().send({
    //     from: manager,
    //     value: web3.utils.toWei("1", "ether"),
    //   });

    //   await campaign.methods
    //     .createRequest("Buy batteries", web3.utils.toWei("0.5", "ether"), manager)
    //     .send({
    //       from: manager,
    //       gas: "1000000",
    //     });
    //   const request = await campaign.methods.requests(0).call();

    //   // add additional test to check other properties on struck
    //   assert.equal("Buy batteries", request.description);
    // });

    // it("doesnt allow a non-manager to create a request", async () => {
    //   const manager = await campaign.methods.manager().call();

    //   await campaign.methods.contribute().send({
    //     from: accounts[1],
    //     value: web3.utils.toWei("0.1", "ether"),
    //   });

    //   assert.notEqual(manager, accounts[1]);
    //   assert.notEqual(manager, accounts[2]);
    //   assert.notEqual(manager, accounts[3]);
    // });

    // it("processes requests", async () => {
    //   await campaign.methods.contribute().send({
    //     from: accounts[0],
    //     value: web3.utils.toWei("10", "ether"),
    //   });

    //   await campaign.methods
    //     .createRequest("A", web3.utils.toWei("5", "ether"), accounts[1])
    //     .send({ from: accounts[0], gas: "1000000" });

    //   await campaign.methods.approveRequest(0).send({
    //     from: accounts[0],
    //     gas: "1000000",
    //   });

    //   await campaign.methods.finalizeRequest(0).send({
    //     from: accounts[0],
    //     gas: "1000000",
    //   });

    //   let balance = await web3.eth.getBalance(accounts[1]);
    //   balance = web3.utils.fromWei(balance, "ether");
    //   balance = parseFloat(balance);

    //   // using 104 to factor in gas costs
    //   assert(balance > 104);
    // });

    // it("can't create a request with amount greater than campaign balance", async () => {
    //   // first need to contribute to campaign so it has a balance of 1 ether
    //   await campaign.methods.contribute().send({
    //     value: web3.utils.toWei("1", "ether"),
    //     from: accounts[1],
    //   });

    //   // get campaign balance
    //   const summary = await campaign.methods.getSummary().call();
    //   const campaignBalance = web3.utils.fromWei(summary[1], "ether");

    //   // create request with amount greater than balance
    //   const amountInRequest = 0.9; // assuming value in request was 0.9 ether

    //   assert(amountInRequest <= campaignBalance);
    // });

    // it("can't create a request, approve or finalise if havent contributed", async () => {
    //   const contributor = accounts[0];

    //   await campaign.methods.contribute().send({
    //     from: contributor,
    //     value: web3.utils.toWei("10", "ether"),
    //   });

    //   const isContributor = await campaign.methods.approvers(contributor).call();

    //   assert(isContributor);
    //   assert.notEqual(contributor, accounts[1]);
    //   assert.notEqual(contributor, accounts[2]);
    //   assert.notEqual(contributor, accounts[3]);
    // });

    // it("can't approve request if already approved or finalise if not approved", async () => {
    //   const approver = accounts[0];

    //   await campaign.methods.contribute().send({
    //     from: approver,
    //     value: web3.utils.toWei("10", "ether"),
    //   });

    //   await campaign.methods
    //     .createRequest("Buy tools", web3.utils.toWei("5", "ether"), accounts[1])
    //     .send({ from: approver, gas: "1000000" });

    //   await campaign.methods.approveRequest(0).send({
    //     from: approver,
    //     gas: "1000000",
    //   });

    //   const isApprover = await campaign.methods.approvers(approver).call();
    //   assert.equal(isApprover, true);
    // });

    // it("can't finalise request if already finalised", async () => {
    //   await campaign.methods.contribute().send({
    //     from: accounts[0],
    //     value: web3.utils.toWei("10", "ether"),
    //   });

    //   await campaign.methods
    //     .createRequest("Buy tools", web3.utils.toWei("5", "ether"), accounts[1])
    //     .send({ from: accounts[0], gas: "1000000" });

    //   await campaign.methods.approveRequest(0).send({
    //     from: accounts[0],
    //     gas: "1000000",
    //   });

    //   await campaign.methods.finalizeRequest(0).send({
    //     from: accounts[0],
    //     gas: "1000000",
    //   });

    //   const requestCount = await campaign.methods.getRequestCount().call();

    //   const requests = await Promise.all(
    //     Array(parseInt(requestCount))
    //       .fill()
    //       .map((element, index) => {
    //         return campaign.methods.requests(index).call();
    //       })
    //   );

    //   assert.equal(requests[0].complete, true);
    // });

    // it("allows a manager to finalise a request", async () => {
    //   const manager = await campaign.methods.manager().call();

    //   await campaign.methods.contribute().send({
    //     from: accounts[1],
    //     value: web3.utils.toWei("5", "ether"),
    //   });

    //   await campaign.methods.contribute().send({
    //     from: accounts[2],
    //     value: web3.utils.toWei("5", "ether"),
    //   });

    //   // get campaign balance
    //   const summary = await campaign.methods.getSummary().call();
    //   const campaignBalance = web3.utils.fromWei(summary[1], "ether");

    //   await campaign.methods
    //     .createRequest("Buy tools", web3.utils.toWei("5", "ether"), manager)
    //     .send({ from: manager, gas: "1000000" });

    //   // make sure 2 people have approved - i.e. > 50%
    //   await campaign.methods.approveRequest(0).send({
    //     from: accounts[1],
    //     gas: "1000000",
    //   });

    //   await campaign.methods.approveRequest(0).send({
    //     from: accounts[2],
    //     gas: "1000000",
    //   });

    //   await campaign.methods.finalizeRequest(0).send({
    //     from: manager,
    //     gas: "1000000",
    //   });

    //   const requestCount = await campaign.methods.getRequestCount().call();

    //   const requests = await Promise.all(
    //     Array(parseInt(requestCount))
    //       .fill()
    //       .map((element, index) => {
    //         return campaign.methods.requests(index).call();
    //       })
    //   );

    //   assert.equal(requests[0].complete, true);
    // });
  });
});

// reset balances between each test? - come back to this
