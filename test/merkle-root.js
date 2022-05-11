const { expect } = require("chai");
const { ethers } = require("hardhat");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

function encodeLeaf(address, spots){
    //Same as 'abi.encodePacked' in solidity
    return ethers.utils.defaultAbiCoder.encode(
        ["address", "uint64"], 
        [address, spots]
    );
}

describe("Check if merkle root is working", function(){
    it("Should be able to verify if the given address is in whitelist or not", async function(){
        //Get a bunch of test addresses
        const [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

        //Create an array of elements you wish to encode in the Merkle tree
        const list = [
            encodeLeaf(owner.address, 2),
            encodeLeaf(addr1.address, 2),
            encodeLeaf(addr2.address, 2),
            encodeLeaf(addr3.address, 2),
            encodeLeaf(addr4.address, 2),
            encodeLeaf(addr5.address, 2)
        ];

        //Creating a Merkle tree using the hashing algorithm 'Keccak256'
        //Making sure to sort the tree so that it can be produced deterministically 
        //regardless of the order of the input list
        const merkleTree = new MerkleTree(list, keccak256, {
            hashLeaves: true,
            sortPairs: true
        });

        //Compute the Merkle Root
        const root = merkleTree.getHexRoot();

        //Deploy the whitelist contract
        const whitelist = await ethers.getContractFactory("Whitelist");
        const Whitelist = await whitelist.deploy(root);
        await Whitelist.deployed();

        //Computing the Merkle Proof of the owner address(0'th item in list)
        //off-chain. The Leaf node is the hash of the value.

        const leaf = keccak256(list[0]);
        const proof = merkleTree.getHexProof(leaf);

        //Providing the Merkle Proof to the contract, and ensure that it can verify
        //that this leaf node was indeed part of the Merkle tree
        let verified = await Whitelist.checkInWhitelist(proof, 2);
        expect(verified).to.equal(true);

        //Providing an invalid Merkle proof to the contract and ensure that 
        //it can verify that this leaf node was not part of the Merkle Tree
        verified = await Whitelist.checkInWhitelist([],2);
        expect(verified).to.equal(false);
    })
})