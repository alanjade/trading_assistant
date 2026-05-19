self.onmessage = function (e) {
  const { id, type, payload } = e.data;
  const parseFiniteNumber = (value, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const FEE_RATES = { maker: 0.0002, taker: 0.0005 };

  if (type === 'futures') {
    const { entryPrice, stopPrice, capital, margin, leverage, feeType } = payload;
    const entry = parseFiniteNumber(entryPrice);
    const stop = parseFiniteNumber(stopPrice);
    const capitalAmount = parseFiniteNumber(capital, 200) || 200;
    const marginAmount = parseFiniteNumber(margin, 20) || 20;
    const feeRate = FEE_RATES[feeType] || FEE_RATES.maker;
    const positionSize = marginAmount * leverage;
    const feeOpen = positionSize * feeRate;
    const feeClose = positionSize * feeRate;
    const feeTotal = feeOpen + feeClose;
    const liquidationDistancePct = leverage > 0 ? (1 / leverage) * 100 : 0;
    const liquidationPrice = entry > 0 && leverage > 0 ? entry * (1 - 1 / leverage) : 0;

    let profit = 0;
    let loss = 0;
    let roiWin = 0;
    let roiLoss = 0;
    let breakEven = 0;

    if (entry > 0 && stop > 0) {
      const riskPerUnit = Math.abs(entry - stop);
      const tokenAmount = positionSize / entry;
      profit = tokenAmount * riskPerUnit * 2 - feeTotal;
      loss = tokenAmount * riskPerUnit + feeTotal;
      roiWin = capitalAmount > 0 ? (profit / capitalAmount) * 100 : 0;
      roiLoss = capitalAmount > 0 ? (loss / capitalAmount) * 100 : 0;
      breakEven = entry + feeOpen / tokenAmount;
    }

    const liquidationBarPct = Math.min((liquidationDistancePct / 10) * 100, 100);
    const liquidationColor =
      liquidationDistancePct > 5 ? '#00e5a0' : liquidationDistancePct > 2 ? '#ffb82e' : '#ff3d5a';

    const result = {
      entry,
      stop,
      capitalAmount,
      marginAmount,
      feeRate,
      positionSize,
      feeOpen,
      feeClose,
      feeTotal,
      liquidationDistancePct,
      liquidationPrice,
      liquidationBarPct,
      liquidationColor,
      danger: liquidationDistancePct <= 2,
      showWarning: leverage >= 10,
      leveragePct: ((leverage - 1) / 124) * 100,
      profit,
      loss,
      roiWin,
      roiLoss,
      breakEven,
      riskPct: capitalAmount > 0 ? (loss / capitalAmount) * 100 : 0,
    };

    self.postMessage({ id, result });
    return;
  }

  if (type === 'riskReward') {
    const { currentDir, rrRatio, entryPrice, stopPrice, sizeUsd, tokens, sym } = payload;
    const entry = parseFiniteNumber(entryPrice);
    const stop = parseFiniteNumber(stopPrice);
    const size = parseFiniteNumber(sizeUsd, 1) || 1;
    const tokenAmount = parseFiniteNumber(tokens) || (entry > 0 ? size / entry : 0);
    const isLong = currentDir === 'long';
    const riskPerUnit = Math.abs(entry - stop);
    const target = isLong ? entry + riskPerUnit * rrRatio : entry - riskPerUnit * rrRatio;
    const breakEven = isLong ? entry + riskPerUnit : entry - riskPerUnit;
    const riskUsd = riskPerUnit * tokenAmount;
    const rewardUsd = riskPerUnit * rrRatio * tokenAmount;
    const total = riskUsd + rewardUsd;

    self.postMessage({
      id,
      result: {
        entry,
        stop,
        size,
        tokenAmount,
        isLong,
        riskPerUnit,
        target,
        breakEven,
        riskUsd,
        rewardUsd,
        riskUsdLabel: riskUsd.toFixed(2),
        rewardUsdLabel: rewardUsd.toFixed(2),
        ticker: sym.replace('USDT', ''),
        rrLabel: `1:${rrRatio % 1 === 0 ? rrRatio : rrRatio.toFixed(1)}`,
        riskBarPct: total > 0 ? Math.round((riskUsd / total) * 100) : Math.round((1 / (1 + rrRatio)) * 100),
      },
    });
    return;
  }

  if (type === 'partialTps') {
    const { previousTps, entry, stop, tokenAmount, isLong } = payload;
    const riskPerUnit = Math.abs(entry - stop);
    if (!entry || !stop || riskPerUnit === 0 || tokenAmount === 0) {
      self.postMessage({ id, result: [] });
      return;
    }

    const configs = payload.configs || [
      [0.5, 50],
      [1, 50],
    ];

    const result = configs.map(([ratio, pct], index) => {
      const price = isLong ? entry + riskPerUnit * ratio : entry - riskPerUnit * ratio;
      const portion = tokenAmount * (pct / 100);
      const pnlUsd = Math.abs(price - entry) * portion;
      const hit = Array.isArray(previousTps) && previousTps[index]?.hit ? previousTps[index].hit : false;
      return {
        ratio,
        pct,
        price,
        pnlUsd,
        hit,
      };
    });

    self.postMessage({ id, result });
    return;
  }

  if (type === 'goal') {
    const { capital, goalPct, margin, leverage, feeType, rrRatio, entryPrice, stopPrice } = payload;
    const capitalAmount = parseFiniteNumber(capital, 200) || 200;
    const goalPctAmount = parseFiniteNumber(goalPct, 10) || 10;
    const marginAmount = parseFiniteNumber(margin, 20) || 20;
    const entry = parseFiniteNumber(entryPrice);
    const stop = parseFiniteNumber(stopPrice);
    const positionSize = marginAmount * leverage;
    const feeTotal = positionSize * (FEE_RATES[feeType] || FEE_RATES.maker) * 2;
    const goalUsd = (capitalAmount * goalPctAmount) / 100;
    const rrLabel = `1:${rrRatio % 1 === 0 ? rrRatio : rrRatio.toFixed(1)}`;

    let perTrade = 0;
    let tradesNeeded = '-';
    let summaryText =
      'Set your Entry and Stop Loss in the R:R Calculator to see how many winning trades you need.';

    if (entry > 0 && stop > 0) {
      const stopDistancePct = (Math.abs(entry - stop) / entry) * 100;
      const grossProfit = positionSize * (stopDistancePct / 100) * rrRatio;
      perTrade = grossProfit - feeTotal;

      if (perTrade > 0) {
        const tradeCount = Math.ceil(goalUsd / perTrade);
        tradesNeeded = tradeCount;
        const setupNote =
          tradeCount <= 2
            ? 'Realistic with 1-2 clean 3-EMA setups.'
            : tradeCount <= 5
            ? `Requires ${tradeCount} wins; avoid overtrading.`
            : 'Too many trades needed; consider increasing margin or leverage cautiously.';

        summaryText =
          `At ${leverage}x with $${marginAmount} margin ($${capitalAmount} capital), each winning trade nets ~$${perTrade.toFixed(2)} (${rrLabel} RR). ` +
          `You need ${tradeCount} winning trade${tradeCount > 1 ? 's' : ''} to hit the $${goalUsd.toFixed(2)} daily goal. ` +
          `Fees total $${feeTotal.toFixed(3)} per round-trip. ${setupNote}`;
      } else {
        tradesNeeded = 'Infinity';
        summaryText = `Fees ($${feeTotal.toFixed(3)}) exceed gross profit at this stop distance. Widen TP or reduce fees.`;
      }
    }

    self.postMessage({
      id,
      result: {
        capitalAmount,
        goalPctAmount,
        marginAmount,
        entry,
        stop,
        positionSize,
        feeTotal,
        goalUsd,
        rrLabel,
        perTrade,
        tradesNeeded,
        summaryText,
      },
    });
    return;
  }
};
