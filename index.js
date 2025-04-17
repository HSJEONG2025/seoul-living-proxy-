const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const app = express();

dotenv.config();

// ✅ 환경변수에서 API 키 로딩
const API_KEY = process.env.SEOUL_API_KEY || "4d5a494e5a736d61373461474e4743";
const BASE_URL = "http://openapi.seoul.go.kr:8088";

// ✅ CORS 허용 (GPT에서 호출 가능하게)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});


// ✅ 기존: /seoul-living 라우터
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


// ✅ 추가: /population 생활인구 프록시
app.get('/population', async (req, res) => {
  const { startIndex, endIndex, baseDate, GU_NM, TIME_SLOT } = req.query;

  let url = `${BASE_URL}/${API_KEY}/json/SPOP_DAILYSUM_JACHI/${startIndex}/${endIndex}/${baseDate}`;
  const params = [];
  if (GU_NM) params.push(`GU_NM=${encodeURIComponent(GU_NM)}`);
  if (TIME_SLOT) params.push(`TIME_SLOT=${encodeURIComponent(TIME_SLOT)}`);
  if (params.length > 0) url += '?' + params.join('&');

  try {
    const response = await axios.get(url);
    const raw = response.data?.SPOP_DAILYSUM_JACHI?.row || [];

    const filtered = raw.filter(item => {
      const matchGU = GU_NM
        ? item.GU_NM?.includes(GU_NM) || item.SIGNGU_NM?.includes(GU_NM)
        : true;
      const matchTime = TIME_SLOT
        ? item.TIME_SLOT === TIME_SLOT
        : true;
      return matchGU && matchTime;
    });

    const result = filtered.map(item => ({
      BASE_DATE: item.BASE_DATE || item.STDR_DE_ID,
      GU_NM: item.GU_NM || item.SIGNGU_NM,
      TIME_SLOT: item.TIME_SLOT || null,
      TOT_LVPOP_CO: item.TOT_LVPOP_CO || item.LVPOP_CO
    }));

    if (result.length === 0) {
      return res.status(200).json({
        success: false,
        status: "NO_DATA",
        message: "해당 날짜와 시간의 생활인구 데이터가 없습니다.",
        result: []
      });
    }

    res.status(200).json({
      success: true,
      status: "OK",
      message: "생활인구 데이터 조회 성공",
      result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: "ERROR",
      message: "서울열린데이터 API 호출 중 오류가 발생했습니다.",
      detail: error.message
    });
  }
});


// ✅ 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 프록시 서버 실행 중: http://localhost:${PORT}`);
});
