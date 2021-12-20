import { useMemo } from "react";
import { num, useBalance } from "@arthuryeti/terra";
import {
  getTokenDenom,
  useTokenPriceInUst,
  useLpToTokens,
  useShareOfPool,
  Asset,
} from "@arthuryeti/terraswap";

import { useGetPool, useShareInUst } from "modules/pool";

export type Pool = {
  assets: [Asset, Asset];
  total: {
    share: string;
    shareInUst: string | null;
  };
  mine: {
    share: string;
    shareInUst: string | null;
    shareOfPool: string | null;
  };
  token1: {
    asset: string;
    share: string;
    amount: string | undefined;
    price: number | null;
  };
  token2: {
    asset: string;
    share: string;
    amount: string | undefined;
    price: number | null;
  };
};

type Params = {
  pairContract: string;
  lpTokenContract: string;
};

export const usePool = ({ pairContract, lpTokenContract }: Params): any => {
  const { data: pool } = useGetPool(pairContract);
  const lpBalance = useBalance(lpTokenContract);
  const shareOfPool = useShareOfPool({ pool, amount1: lpBalance });
  // const stakedAmount = useStakedLpAmount(lpTokenContract);
  const tokenAmounts = useLpToTokens({ pool, amount: lpBalance });
  const myShare = num(lpBalance).toString();

  const token1 = useMemo(() => {
    if (pool == null) {
      return null;
    }

    return getTokenDenom(pool.assets[0].info);
  }, [pool]);

  const token2 = useMemo(() => {
    if (pool == null) {
      return null;
    }

    return getTokenDenom(pool.assets[1].info);
  }, [pool]);

  const token1Price = useTokenPriceInUst(token1);
  const token2Price = useTokenPriceInUst(token2);

  const myShareInUst = useShareInUst({
    pool,
    amount: myShare,
  });

  const totalShareInUst = useShareInUst({
    pool,
    amount: pool?.total_share,
  });

  return useMemo(() => {
    if (pool == null || token1 == null || token2 == null) {
      return null;
    }

    return {
      assets: pool.assets,
      total: {
        share: pool.total_share,
        shareInUst: totalShareInUst,
      },
      mine: {
        share: myShare,
        shareInUst: myShareInUst,
        shareOfPool,
      },
      token1: {
        asset: token1,
        share: pool.assets[0].amount,
        amount: tokenAmounts?.[token1],
        price: token1Price,
      },
      token2: {
        asset: token2,
        share: pool.assets[1].amount,
        amount: tokenAmounts?.[token2],
        price: token2Price,
      },
    };
  }, [
    pool,
    totalShareInUst,
    shareOfPool,
    tokenAmounts,
    token1,
    token2,
    token1Price,
    token2Price,
    myShare,
    myShareInUst,
  ]);
};

export default usePool;
