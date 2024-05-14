# Gnosis Pay + AAVE

Deposit the extra balance of your Gnosis Pay card to AAVE. Top up the card daily.


1. Add a Roles Module to a Gnosis Pay Safe to allow an address to (only) withdraw EURe from AAVE, back to your safe.

2. Create an OpenZeppelin Defender action to automate daily withdrals

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v21)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Instructions


1. Install the dependencies and build eth-sdk

```
yarn install
yarn eth-sdk
```

2. Create an OpenZeppelin Defender Relayer in Gnosis chain and send it some xDAI

https://defender.openzeppelin.com/v2/#/manage/relayers

Save the relayer's credentiasl to `.env`


3. Run the webapp and setup the roles

```
yarn start
```
You need to input the Gnosis Pay Safe address and the Executor (OpenZeppelin Relayer) address

Because of how Gnosis Pay works, all onchain actions have a 3 minute delay. For each action it must be first queued and executed after (minimum) 3 minutes

Setting up the Roles Module takes 8 transactions, but they are bundled into a single one. (Additionally it can deposit some EURe to AAve if the `deposit amount` in the bottom has a value)

The actions executed are:
* Deploy a Zodiac Roles Module (the same already used by Gnosis Pay)
* Create a Role which is limited to withdrawing EURe from AAVE
* Assign the Role to the Executor Address
* Approve AAVE to deposit and withdraw EURe from the Safe
* Enable the new Module under the Safe's Delay Module


4. Copy and fill in `.env` from `.env.example`
* GP_SAFE: Address of the Gnosis Pay Safe
* DELAY: Address of the Delay module (shown in the webapp)
* ROLES: Address of the new Roles module (shown in the webapp)
* TOPUP_TRIGGER: The amount of EURe which should always be available in the Safe, should be the Gnosis Pay's max daily limit.
* TOPUP_TO: The desired EURe balance after each topup, must be greater or equal to TOPUP_TRIGGER. If every small Gnosis Pay Tx triggers a reload, the gas cost of withdrawing is greater than the accured interest in AAVE. The difference between TOPUP_TO and TOPUP_TRIGGER acts as a buffer to reduce the amount of withdrals.


5. Build the executor code

```
yarn build:defender
```

6. Create two new Actions in OpenZeppelin

The first one for `./packages/defender/dist/queue.js` and the second one for `./packages/defender/dist/execute.js`. There should be at least 5 minutes of delay between the first and the second task. Since adding a new tx to the queue freezes the card for 3 minutes, so schedule it for an appropiate time


## Local Executor

The executor tasks can be run locally (after setting up the Relays and credentials) with `yarn queue` and `yarn execute`
