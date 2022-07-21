const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Campaign", function () {
  let factory,
    campaignAddress,
    campaign,
    deployer,
    manager,
    account2,
    account3,
    minimumFee;

  beforeEach(async () => {
    // owner/manager = deployer
    // A Signer = object that represents an Ethereum account.
    // It's used to send transactions to contracts and other accounts
    [manager, account2, account3] = await ethers.getSigners();

    const accounts = await getNamedAccounts();
    deployer = accounts.deployer;

    await deployments.fixture(["campaignFactory"]);
    factory = await ethers.getContract("CampaignFactory", deployer);

    minimumFee = tokens("100");
    // create first campaign for testing
    await factory.createCampaign(minimumFee);
    [campaignAddress] = await factory.getDeployedCampaigns();

    campaign = await ethers.getContractAt("Campaign", campaignAddress);
  });

  describe("Deployment", () => {
    it("deploys a factory and a campaign", async () => {
      assert.ok(campaign.address);
      assert.ok(factory.address);
    });

    it("marks deployer as the campaign manager", async () => {
      const getManagerCall = await campaign.getManager();
      expect(deployer).to.equal(getManagerCall);
      expect(deployer).to.equal(manager.address);
    });

    it("minimum fee on the campaign was set correctly", async () => {
      const contractMinimumFee = await campaign.getMinimumContribution();
      expect(minimumFee).to.equal(contractMinimumFee);
    });
  });

  describe("Contribute", () => {
    beforeEach(async () => {
      await campaign.connect(account3).contribute({ value: minimumFee });
    });

    describe("Success", () => {
      it("allows people to contribute money and marks them as approvers", async () => {
        const isContributor = await campaign.getApprover(account3.address);
        assert(isContributor);
      });

      it("can get correct contract balance after someone has contributed", async () => {
        const contractBalance = await campaign.getBalance();
        expect(minimumFee).to.equal(contractBalance);
      });
    });

    describe("Failure", () => {
      it("reverts if contribution value is less than minimum contribution", async () => {
        await expect(
          campaign.connect(account3).contribute({ value: tokens("10") })
        ).to.be.revertedWith("Campaign__ContributionLessThanMinimum");
      });

      it("reverts if manager tries to contribute to own contract", async () => {
        await expect(
          campaign.connect(manager).contribute({ value: minimumFee })
        ).to.be.revertedWith("Campaign__ManagerCannotBeAContributor");
      });
    });
  });

  describe("Create a request", () => {
    let requestDescription;
    beforeEach(async () => {
      await campaign.connect(account3).contribute({ value: minimumFee });

      requestDescription = "Buy batteries";

      await campaign.createRequest(
        requestDescription,
        minimumFee,
        manager.address
      );
    });

    describe("Success", () => {
      it("allows a manager to create a request", async () => {
        const request = await campaign.getRequestCount();
        assert(request.toNumber() > 0);
      });

      it("can retrieve request details after one is created", async () => {
        const request = await campaign.getRequest(0);
        expect(request[0]).to.equal(requestDescription);
        expect(request[1]).to.equal(minimumFee);
        expect(request[2]).to.equal(manager.address);
        expect(request[3]).to.equal(false);
        expect(request[4]).to.equal("0");
      });
    });

    describe("Failure", () => {
      it("reverts if you try create a request with a non-manager", async () => {
        await expect(
          campaign
            .connect(account3)
            .createRequest("Buy batteries", minimumFee, manager.address)
        ).to.be.revertedWith("Campaign__OnlyManager");
      });

      it("reverts when you create a request with amount greater than campaign balance", async () => {
        await expect(
          campaign.createRequest(
            "Buy batteries",
            tokens("200"),
            manager.address
          )
        ).to.be.revertedWith("Campaign__ReqAmountGreaterThanCampaignBalance");
      });

      it("reverts when you create a request with amount <= 0", async () => {
        await expect(
          campaign.createRequest(
            "Buy batteries",
            tokens("0"),
            manager.address
          )
        ).to.be.revertedWith("Campaign__ReqAmountNotGreaterThanZero");
      });
    });
  });

  describe("Approve", () => {
    beforeEach(async () => {
      await campaign.connect(account3).contribute({ value: minimumFee });

      await campaign.createRequest(
        "Buy batteries",
        minimumFee,
        manager.address
      );
    });

    describe("Success", () => {
      it("can approve request", async () => {
        await campaign.connect(account3).approveRequest(0);
        const approvalCount = await campaign.getNumApprovers();
        assert(approvalCount.toNumber() > 0);
      });
    });

    describe("Failure", () => {
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
        await expect(
          campaign.connect(account2).approveRequest(10)
        ).to.be.revertedWith("Campaign__RequestDoesNotExist");
      });
    });
  });

  describe("Finalize", () => {
    beforeEach(async () => {
      await campaign.connect(account2).contribute({ value: minimumFee });

      await campaign.createRequest(
        "Buy batteries",
        minimumFee,
        manager.address
      );
    });

    describe("Success", () => {
      it("manager can finalise request", async () => {
        await campaign.connect(account2).approveRequest(0);
        await campaign.finalizeRequest(0);
      });
    });

    describe("Failure", () => {
      it("reverts if non-manager tries to finalise request", async () => {
        await campaign.connect(account2).approveRequest(0);
        await expect(
          campaign.connect(account2).finalizeRequest(0)
        ).to.be.revertedWith("Campaign__OnlyManager");
      });

      it("reverts if finalise request with record that doesnt exist", async () => {
        await campaign.connect(account2).approveRequest(0);
        await expect(campaign.finalizeRequest(10)).to.be.revertedWith(
          "Campaign__RequestDoesNotExist"
        );
      });

      it("reverts when not enough approvals to finalize a request", async () => {
        await campaign.connect(account3).contribute({ value: minimumFee });

        await campaign.connect(account2).approveRequest(0);

        await expect(campaign.finalizeRequest(0)).to.be.revertedWith(
          "Campaign__NotEnoughApprovals"
        );
      });

      it("reverts when you finalize request with amount greater than campaign balance", async () => {
        await campaign.createRequest(
          "Request 2",
          tokens("100"),
          manager.address
        );

        await campaign.connect(account2).approveRequest(0);
        await campaign.connect(account2).approveRequest(1);

        await campaign.connect(manager).finalizeRequest(0);
        await expect(campaign.connect(manager).finalizeRequest(1)).to.be.revertedWith(
          "Campaign__ReqAmountGreaterThanCampaignBalance"
        );
      });
    });
  });
});
