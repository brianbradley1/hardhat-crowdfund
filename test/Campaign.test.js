const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");

let factory,
  campaignAddress,
  campaign,
  deployer,
  manager,
  account2,
  account3,
  account4,
  account5,
  account6;

describe("Campaign Unit Test", function () {
  beforeEach(async () => {
    // owner/manager = deployer
    // A Signer = object that represents an Ethereum account.
    // It's used to send transactions to contracts and other accounts
    [manager, account2, account3, account4, account5, account6] =
      await ethers.getSigners();

    const { deploy } = deployments;
    const accounts = await getNamedAccounts();
    deployer = accounts.deployer;

    // deploy factory contract
    await deployments.fixture(["campaignFactory"]);
    factory = await ethers.getContract("CampaignFactory", deployer);

    const minimumFee = ethers.utils.parseEther("100");
    // create first campaign for testing
    await factory.createCampaign(minimumFee);
    [campaignAddress] = await factory.getDeployedCampaigns();

    campaign = await ethers.getContractAt("Campaign", campaignAddress);
    manager = await campaign.getManager();
  });

  describe("Campaigns", () => {
    describe("Initial checks", () => {
      it("deploys a factory and a campaign", () => {
        assert.ok(campaign.address);
        assert.ok(factory.address);
      });

      it("marks caller as the campaign manager", async () => {
        expect(deployer).to.equal(manager);
      });
    });

    describe("Contribute", () => {
      it("allows people to contribute money and marks them as approvers", async () => {
        await campaign
          .connect(account3)
          .contribute({ value: ethers.utils.parseEther("200") });
        const isContributor = await campaign.getApprover(account3.address);
        assert(isContributor);
      });

      it("reverts if contribution value is less than minimum contribution", async () => {
        await expect(
          campaign
            .connect(account3)
            .contribute({ value: ethers.utils.parseEther("10") })
        ).to.be.revertedWith("Campaign__ContributionLessThanMinimum");
      });
    });

    describe("Create a request", () => {
      beforeEach(async () => {
        // contribute before each test to create a request
        await campaign
          .connect(account3)
          .contribute({ value: ethers.utils.parseEther("100") });
      });

      it("allows a manager to create a request", async () => {
        await campaign.createRequest(
          "Buy batteries",
          ethers.utils.parseEther("50"),
          manager
        );

        const request = await campaign.getRequestCount();
        assert(request.toNumber() > 0);
      });

      it("reverts if you try create a request with a non-manager", async () => {
        await expect(
          campaign
            .connect(account3)
            .createRequest(
              "Buy batteries",
              ethers.utils.parseEther("50"),
              manager
            )
        ).to.be.revertedWith("Campaign__OnlyManager");
      });

      it("reverts when you create a request with amount greater than campaign balance", async () => {
        await expect(
          campaign.createRequest(
            "Buy batteries",
            ethers.utils.parseEther("200"),
            manager
          )
        ).to.be.revertedWith("Campaign__ReqAmountGreaterThanCampaignBalance");
      });
    });

    describe("approval", () => {
      beforeEach(async () => {
        // contribute and create request before each approval test
        await campaign
          .connect(account3)
          .contribute({ value: ethers.utils.parseEther("100") });

        await campaign.createRequest(
          "Buy batteries",
          ethers.utils.parseEther("50"),
          manager
        );
      });

      it("can approve request", async () => {
        await campaign.connect(account3).approveRequest(0);
        const approvalCount = await campaign.getNumApprovers();
        assert(approvalCount.toNumber() > 0);
      });

      it("reverts when you try approve a request thats already approved", async () => {
        await campaign.connect(account3).approveRequest(0);
        const approvalCount = await campaign.getNumApprovers();
        if (approvalCount.toNumber() > 0) {
          await expect(
            campaign.connect(account3).approveRequest(0)
          ).to.be.revertedWith("Campaign__AlreadyApproved");
        }
      });

      it("reverts if caller is not a contributor", async () => {
        await expect(
          campaign.connect(account2).approveRequest(0)
        ).to.be.revertedWith("Campaign__NotAContributor");
      });
    });

    describe("finalise", () => {
      beforeEach(async () => {
        //const approvalCountBefore = await campaign.getNumApprovers();
        //console.log(approvalCountBefore.toNumber());
        // reset state
        // await network.provider.request({
        //   method: "hardhat_reset",
        //   params: [],
        // });
        //const approvalCountAfter = await campaign.getNumApprovers();
        //console.log(approvalCountAfter.toNumber());

        // contribute and create request before each approval test
        await campaign
          .connect(account2)
          .contribute({ value: ethers.utils.parseEther("100") });

        await campaign.createRequest(
          "Buy batteries",
          ethers.utils.parseEther("50"),
          manager
        );
      });
      it("can finalise request", async () => {
        await campaign.connect(account2).approveRequest(0);
        await campaign.finalizeRequest(0);
      });

      it("reverts when not enough approvals to finalize a request", async () => {
        await campaign
          .connect(account3)
          .contribute({ value: ethers.utils.parseEther("100") });

        await campaign
          .connect(account4)
          .contribute({ value: ethers.utils.parseEther("100") });

        await campaign
          .connect(account5)
          .contribute({ value: ethers.utils.parseEther("100") });

        await campaign.connect(account2).approveRequest(0);

        const approvalCount = await campaign.getNumApprovers();
        assert(approvalCount.toNumber() > 0);

        await expect(campaign.finalizeRequest(0)).to.be.revertedWith(
          "Campaign__NotEnoughApprovals"
        );
      });

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
});
// reset balances between each test? - come back to this

// it("Can complete request end to end process", async () => {
//   await campaign
//     .connect(account3)
//     .contribute({ value: ethers.utils.parseEther("100") });

//   await campaign.createRequest(
//     "Buy batteries",
//     ethers.utils.parseEther("50"),
//     manager
//   );

//   await campaign.approveRequest(0).send({
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
