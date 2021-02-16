import useSWR from "swr";

export default function CoingeckoPriceData() {
  const { data, error } = useSWR(`/api/coingecko-prices`);

  return {
    data: data,
    isLoading: !error && !data,
    isError: error,
  };
}
