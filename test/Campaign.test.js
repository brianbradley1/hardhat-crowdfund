const { assert, expect } = require("chai");
const hre = require("hardhat");
const { getNamedAccounts, deployments, ethers } = require("hardhat");

let factory,
  campaignAddress,
  campaign,
  deployer,
  manager,
  account2,
  account3,
  account4,
  account5,
  account6,
  minimumFee;

describe("Campaign Unit Test", function () {
  beforeEach(async () => {
    // reset state
    //await hre.network.provider.send("hardhat_reset");

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

    minimumFee = ethers.utils.parseEther("100");
    // create first campaign for testing
    await factory.createCampaign(minimumFee);
    [campaignAddress] = await factory.getDeployedCampaigns();

    campaign = await ethers.getContractAt("Campaign", campaignAddress);
    manager = await campaign.getManager();

    //const deployedContracts = await factory.getDeployedCampaigns();
    //console.log(deployedContracts);
  });

  describe("Campaigns", () => {
    describe("Initial checks", () => {
      it("deploys a factory and a campaign", async () => {
        assert.ok(campaign.address);
        assert.ok(factory.address);
      });

      it("marks caller as the campaign manager", async () => {
        expect(deployer).to.equal(manager);
      });

      it("minimum fee on the campaign was set correctly", async () => {
        const contractMinimumFee = await campaign.getMinimumContribution();
        expect(minimumFee).to.equal(contractMinimumFee);
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

      it("reverts if approve request with record that doesnt exist", async () => {
        await expect(campaign.connect(account2).approveRequest(10)).to.be.revertedWith(
          "Campaign__RequestDoesNotExist"
        );
      });
    });

    describe("finalise", () => {
      beforeEach(async () => {
        // contribute and create request before each approval test
        await campaign
          .connect(account2)
          .contribute({ value: ethers.utils.parseEther("100") });

        await campaign.createRequest(
          "Buy batteries",
          ethers.utils.parseEther("50"),
          manager
        );

        //console.log("before finalise");
      });

      it("manager can finalise request", async () => {
        await campaign.connect(account2).approveRequest(0);
        await campaign.finalizeRequest(0);
      });

      it("reverts if non-manager tries to finalise request", async () => {
        await campaign.connect(account2).approveRequest(0);
        await expect(campaign.connect(account2).finalizeRequest(0)).to.be.revertedWith(
          "Campaign__OnlyManager"
        );
      });

      it("reverts if finalise request with record that doesnt exist", async () => {
        await campaign.connect(account2).approveRequest(0);
        await expect(campaign.finalizeRequest(10)).to.be.revertedWith(
          "Campaign__RequestDoesNotExist"
        );
      });

      it("reverts when not enough approvals to finalize a request", async () => {
        //const approvalCountBefore = await campaign.getNumApprovers();
        //console.log(approvalCountBefore.toNumber());

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

        await expect(campaign.finalizeRequest(0)).to.be.revertedWith(
          "Campaign__NotEnoughApprovals"
        );
      });
    });
  });
});
// reset balances between each test? - come back to this
