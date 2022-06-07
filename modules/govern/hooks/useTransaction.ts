import { useCallback, useState, useEffect, useMemo } from 'react'
import {
  Coins,
  Coin,
  MsgExecuteContract,
  CreateTxOptions,
  Fee,
  TxInfo,
} from '@terra-money/terra.js'
import {
  useWallet,
  UserDenied,
  CreateTxFailed,
  TxFailed,
  TxUnspecifiedError,
  Timeout,
} from '@terra-money/wallet-provider'
import { useMutation, useQuery } from 'react-query'

// import { useTerraWebapp } from '../context'
import useDebounceValue from './useDebounceValue'
// import useAddress from './useAddress'
import {useConnectedWallet, useLCDClient} from '@terra-money/wallet-provider';

export enum TxStep {
  /**
   * Idle
   */
  Idle = 0,
  /**
   * Estimating fees
   */
  Estimating = 1,
  /**
   * Ready to post transaction
   */
  Ready = 2,
  /**
   * Signing transaction in Terra Station
   */
  Posting = 3,
  /**
   * Broadcasting
   */
  Broadcasting = 4,
  /**
   * Succesful
   */
  Success = 5,
  /**
   * Failed
   */
  Failed = 6,
}

type Params = {
  msgs: MsgExecuteContract[] | null
  gasAdjustment?: number
  estimateEnabled?: boolean
  onBroadcasting?: (txHash: string) => void
  onSuccess?: (txHash: string, txInfo?: TxInfo) => void
  onError?: (txHash?: string, txInfo?: TxInfo) => void
}

export const useTransaction = ({
  msgs,
  gasAdjustment = 1.2,
  estimateEnabled = true,
  onBroadcasting,
  onSuccess,
  onError,
}: Params) => {
  // const { client } = useTerraWebapp()
  const lcd = useLCDClient();
  const connectedWallet = useConnectedWallet();
  const address = connectedWallet?.walletAddress
  const { post } = useWallet()
  const debouncedMsgs = useDebounceValue(msgs, 200)

  const [txStep, setTxStep] = useState<TxStep>(TxStep.Idle)
  const [txHash, setTxHash] = useState<string | undefined>(undefined)
  const [error, setError] = useState<unknown | null>(null)

  const { data: fee } = useQuery<unknown, unknown, Fee | null>(
    ['fee', debouncedMsgs, error],
    async () => {
      if (debouncedMsgs == null || txStep != TxStep.Idle || error != null) {
        throw new Error('Error in estimaging fee')
      }

      setError(null)
      setTxStep(TxStep.Estimating)

      const txOptions = {
        msgs: debouncedMsgs,
        gasPrices: new Coins([new Coin('uusd', 0.15)]),
        gasAdjustment,
        feeDenoms: ['uusd'],
      }

      const accountInfo = await lcd.auth.accountInfo(address)

      return lcd.tx.estimateFee(
        [
          {
            sequenceNumber: accountInfo.getSequenceNumber(),
            publicKey: accountInfo.getPublicKey(),
          },
        ],
        txOptions,
      )
    },
    {
      enabled:
        debouncedMsgs != null &&
        txStep == TxStep.Idle &&
        error == null &&
        estimateEnabled,
      refetchOnWindowFocus: false,
      retry: false,
      onSuccess: () => {
        setTxStep(TxStep.Ready)
      },
      onError: e => {
        // @ts-expect-error - don't know anything about error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (e?.response?.data?.message) {
          // @ts-expect-error - don't know anything about error
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          setError(e.response.data.message)
        } else {
          setError('Something went wrong')
        }

        setTxStep(TxStep.Idle)
      },
    },
  )

  const { mutate } = useMutation(
    (data: CreateTxOptions) => {
      console.log({data})
      return post(data)
    },
    {
      onMutate: () => {
        setTxStep(TxStep.Posting)
      },
      onError: (e: unknown) => {
        if (e instanceof UserDenied) {
          setError('User Denied')
        } else if (e instanceof CreateTxFailed) {
          setError(`Create Tx Failed: ${e.message}`)
        } else if (e instanceof TxFailed) {
          setError(`Tx Failed: ${e.message}`)
        } else if (e instanceof Timeout) {
          setError('Timeout')
        } else if (e instanceof TxUnspecifiedError) {
          setError(`Unspecified Error: ${e.message}`)
        } else {
          setError(
            `Unknown Error: ${e instanceof Error ? e.message : String(e)}`,
          )
        }

        setTxStep(TxStep.Failed)

        onError?.()
      },
      onSuccess: data => {
        setTxStep(TxStep.Broadcasting)
        setTxHash(data.result.txhash)
        onBroadcasting?.(data.result.txhash)
      },
    },
  )

  const { data: txInfo } = useQuery(
    ['txInfo', txHash],
    () => {
      if (txHash == null) {
        return
      }

      return lcd.tx.txInfo(txHash)
    },
    {
      enabled: txHash != null,
      retry: true,
    },
  )

  const reset = () => {
    setError(null)
    setTxHash(undefined)
    setTxStep(TxStep.Idle)
  }

  const submit = useCallback(async () => {
    if (fee == null || msgs == null || msgs.length < 1) {
      return
    }

    console.log({msgs})

    mutate({
      msgs,
      fee,
    })
  }, [msgs, fee, mutate])

  useEffect(() => {
    if (txInfo != null && txHash != null) {
      if (txInfo.code) {
        setTxStep(TxStep.Failed)
        onError?.(txHash, txInfo)
      } else {
        setTxStep(TxStep.Success)
        onSuccess?.(txHash, txInfo)
      }
    }
  }, [txInfo, onError, onSuccess, txHash])

  useEffect(() => {
    if (error) {
      setError(null)
    }

    if (txStep != TxStep.Idle) {
      setTxStep(TxStep.Idle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMsgs])

  return useMemo(() => {
    return {
      fee,
      submit,
      txStep,
      txInfo,
      txHash,
      error,
      reset,
    }
  }, [fee, submit, txStep, txInfo, txHash, error, reset])
}

export default useTransaction
