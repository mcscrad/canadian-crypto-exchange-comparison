// import styles from "../styles/Home.module.css";
import {
  Avatar,
  Card,
  Checkbox,
  DisplayText,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  SkeletonBodyText,
  TextStyle,
  Toast,
} from "@shopify/polaris";
import React, { useState } from "react";
import useSWR from "swr";
import { DATA } from "../public/data";

function CoingeckoPriceData() {
  const { data, error } = useSWR(`/api/coingecko-prices`);

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}

function calculateFee(
  coinPriceCache,
  isBuy,
  exchangeInfo,
  method,
  amount,
  coin
) {
  return (
    ((method.fee(amount) +
      exchangeInfo.tradingFee(amount) +
      exchangeInfo.realSpread(amount) +
      (isBuy
        ? exchangeInfo.withdrawFee[coin] * coinPriceCache[coin] || 0
        : 0)) /
      amount) *
    100
  );
}

function calculateLowestFeeMethod(
  coinPriceCache,
  isBuy,
  exchangeInfo,
  methods,
  amount
) {
  return methods
    .filter((method) => amount >= method.min && amount <= method.max)
    .reduce((accumulator, currentMethod) => {
      const fee = calculateFee(
        coinPriceCache,
        isBuy,
        exchangeInfo,
        currentMethod,
        amount,
        "BTC"
      );
      if (Object.keys(accumulator).length === 0 || accumulator.fee > fee) {
        accumulator = {
          fee: +fee.toFixed(2),
          exchangeInfo,
          method: currentMethod,
        };
      }
      return accumulator;
    }, {});
}

function calculateLowest3DepositsAndWithdraws(coinPriceCache, amount) {
  let deposits = [];
  let withdraws = [];
  Object.keys(DATA).forEach((exchangeName) => {
    const exchangeInfo = DATA[exchangeName];
    const deposit = calculateLowestFeeMethod(
      coinPriceCache,
      true,
      exchangeInfo,
      exchangeInfo.depositMethods,
      amount
    );
    const withdraw = calculateLowestFeeMethod(
      coinPriceCache,
      false,
      exchangeInfo,
      exchangeInfo.withdrawMethods,
      amount
    );
    if (Object.keys(deposit).length !== 0) deposits.push(deposit);
    if (Object.keys(withdraw).length !== 0) withdraws.push(withdraw);
  });
  return {
    deposits: deposits.sort((a, b) => a.fee - b.fee).slice(0, 3),
    withdraws: withdraws.sort((a, b) => a.fee - b.fee).slice(0, 3),
  };
}

function RenderResourceList(props) {
  const { amount, isBuy } = props;
  const coingeckoPriceDataResponse = CoingeckoPriceData();

  if (
    coingeckoPriceDataResponse.isLoading ||
    coingeckoPriceDataResponse.isError
  ) {
    return (
      <Card sectioned>
        <SkeletonBodyText lines={2} />
        <SkeletonBodyText />
      </Card>
    );
  }

  const result = calculateLowest3DepositsAndWithdraws(
    coingeckoPriceDataResponse.data.coinPriceCache,
    amount
  );
  const rows = isBuy ? result.deposits : result.withdraws;
  const items = rows.map((row) => ({
    fee: row.fee,
    method: row.method.type,
    name: row.exchangeInfo.name,
    url: `/exchanges/${row.exchangeInfo.name}`,
  }));

  return (
    <Layout sectioned>
      <Layout.AnnotatedSection title={`$${amount}`} description="">
        <Card>
          <ResourceList
            resourceName={{ singular: "exchange", plural: "exchanges" }}
            items={items}
            renderItem={(item) => {
              const { fee, method, name, url } = item;
              // const { id, url, name, location, latestOrderUrl } = item;
              // const media = <Avatar customer size="medium" name={name} />;
              // const shortcutActions = latestOrderUrl
              //   ? [
              //       {
              //         content: "View latest order",
              //         accessibilityLabel: `View ${name}’s latest order`,
              //         url: latestOrderUrl,
              //       },
              //     ]
              //   : null;
              // const name = exchangeInfo.name;

              return (
                <ResourceItem
                  id={name}
                  url={url}
                  // media={media}
                  // accessibilityLabel={`View details for ${name}`}
                  // shortcutActions={shortcutActions}
                  // persistActions
                >
                  <div style={{ display: "flex", textAlign: "center" }}>
                    <h3
                      style={{ flex: "0 1 33%", textTransform: "capitalize" }}
                    >
                      <TextStyle variation="strong">{name}</TextStyle>
                    </h3>
                    <div style={{ flex: "0 1 33%" }}>{method}</div>
                    <div style={{ flex: "0 1 33%" }}>{fee}%</div>
                  </div>
                </ResourceItem>
              );
            }}
          />
        </Card>
      </Layout.AnnotatedSection>
    </Layout>
  );
}

export default function Home() {
  const [checked, setChecked] = useState(true);
  const checkbox = (
    <Checkbox
      label="Sell / Buy"
      checked={checked}
      onChange={() => setChecked(!checked)}
    />
  );
  return (
    <Page primaryAction={checkbox}>
      {/* <div className={styles.container}> */}
      <DisplayText size="medium" element="h2">
        Exchanges with the lowest fees.
      </DisplayText>
      <RenderResourceList amount={100} isBuy={checked} />
      <RenderResourceList amount={500} isBuy={checked} />
      <RenderResourceList amount={1000} isBuy={checked} />
      <RenderResourceList amount={5000} isBuy={checked} />
      <RenderResourceList amount={15000} isBuy={checked} />
    </Page>
  );
}