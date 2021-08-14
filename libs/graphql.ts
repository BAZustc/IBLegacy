export async function fetchMantle(
  url = "https://mantle.terra.dev/",
  query,
  variables = {}
) {
  return fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });
}
