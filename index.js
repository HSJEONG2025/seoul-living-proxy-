const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const app = express();

dotenv.config();

const API_KEY = process.env.SEOUL_API_KEY;
const BASE_URL = "http://openapi.seoul.go.kr:8088";

app.get("/seoul-living", async (req, res) => {
  const { startIndex = 1, endIndex = 100, startDate, endDate, dongCode } = req.query;

  let url = `${BASE_URL}/${API_KEY}/json/LivingPopulation/${startIndex}/${endIndex}`;
  const params = new URLSearchParams();

  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (dongCode) params.append("dongCode", dongCode);

  const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

  try {
    const response = await axios.get(fullUrl);
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching from Seoul OpenAPI:", error.message);
    res.status(500).json({ error: "Failed to fetch data from Seoul API" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Proxy server running at http://localhost:${PORT}`);
});
