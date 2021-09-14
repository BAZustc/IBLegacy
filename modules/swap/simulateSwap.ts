import { LCDClient } from "@terra-money/terra.js";

import { toToken, getTokenDenom, isNativeToken } from "@arthuryeti/terra";
import { findSwapRoute } from "modules/swap";
import { Pair } from "types/common";

export const createMultiSwapOperations = (
  from: string,
  route: any[],
  operations: any[] = []
): any[] => {
  if (route.length === 0) {
    return operations;
  }

  const assets = route[0]?.asset_infos;

  if (!assets) {
    return operations;
  }

  const sortedAssets = [...assets].sort((a) =>
    getTokenDenom(a) === from ? -1 : 1
  );

  const operation = sortedAssets.every(isNativeToken)
    ? {
        native_swap: {
          offer_denom: sortedAssets[0].native_token.denom,
          ask_denom: sortedAssets[1].native_token.denom,
        },
      }
    : {
        terra_swap: {
          offer_asset_info: sortedAssets[0],
          ask_asset_info: sortedAssets[1],
        },
      };

  const nextFrom = getTokenDenom(sortedAssets[1]);

  return createMultiSwapOperations(nextFrom, route.slice(1), [
    ...operations,
    operation,
  ]);
};

type CreateMultiSwapQueryOptions = {
  client: LCDClient;
  routeContract: string;
  from: string;
  route: Pair[];
  amount: string;
};

type CreateMultiSwapQueryResponse = {
  amount: string;
};

const createMultiSwapQuery = async ({
  client,
  routeContract,
  from,
  route,
  amount,
}: CreateMultiSwapQueryOptions): Promise<CreateMultiSwapQueryResponse> => {
  const operations = createMultiSwapOperations(from, route);

  return client.wasm.contractQuery(routeContract, {
    simulate_swap_operations: {
      offer_amount: amount,
      operations,
    },
  });
};

type CreateMonoSwapQueryOptions = {
  client: LCDClient;
  token: string;
  route: Pair[];
  amount: string;
};

type CreateMonoSwapQueryResponse = {
  return_amount: string;
  spread_amount: string;
};

const createMonoSwapQuery = async ({
  client,
  token,
  route,
  amount,
}: CreateMonoSwapQueryOptions): Promise<CreateMonoSwapQueryResponse> => {
  const [{ contract }] = route;

  return client.wasm.contractQuery(contract, {
    simulation: {
      offer_asset: toToken({ token, amount }),
    },
  });
};

export const simulateSwap = async (
  client: LCDClient,
  routeContract,
  routes,
  from,
  to,
  amount
) => {
  const route = findSwapRoute(routes, from, to);

  if (!route) {
    return {
      amount: "0",
      spreadAmount: "0",
    };
  }

  if (route.length === 1) {
    try {
      const result = await createMonoSwapQuery({
        client,
        token: from,
        route,
        amount,
      });

      return {
        error: false,
        message: null,
        amount: result.return_amount,
        spreadAmount: result.spread_amount,
      };
    } catch (e) {
      return {
        error: true,
        message: e.response.data.error,
        data: null,
      };
    }
  }

  try {
    const result = await createMultiSwapQuery({
      client,
      routeContract,
      from,
      route,
      amount,
    });

    return {
      error: false,
      message: null,
      amount: result.amount,
      spreadAmount: null,
    };
  } catch (e) {
    return {
      error: true,
      message: e.response.data.error,
      data: null,
    };
  }
};
