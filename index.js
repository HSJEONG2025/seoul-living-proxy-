const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// ✅ CORS 허용 (GPT에서 호출 가능하게)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// ✅ /population 엔드포인트: 자치구 생활인구 조회
app.get('/population', async (req, res) => {
  const { startIndex, endIndex, baseDate, GU_NM, TIME_SLOT } = req.query;

  const API_KEY = process.env.SEOUL_API_KEY || "4d5a494e5a736d61373461474e4743";
  let url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/SPOP_DAILYSUM_JACHI/${startIndex}/${endIndex}/${baseDate}`;

  const params = [];
  if (GU_NM) params.push(`GU_NM=${encodeURIComponent(GU_NM)}`);
  if (TIME_SLOT) params.push(`TIME_SLOT=${encodeURIComponent(TIME_SLOT)}`);
  if (params.length > 0) url += '?' + params.join('&');

  try {
    const response = await axios.get(url);
    const raw = response.data?.SPOP_DAILYSUM_JACHI?.row || [];

    // ✅ GU_NM 보정: "동대문" → "동대문구"
    let fixedGU = GU_NM;
    if (GU_NM && !GU_NM.endsWith("구")) {
      fixedGU = GU_NM + "구";
    }

    const filtered = raw.filter(item => {
      const matchGU = fixedGU
        ? item.GU_NM?.includes(fixedGU) || item.SIGNGU_NM?.includes(fixedGU)
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
        message: "요청하신 조건에 해당하는 생활인구 데이터가 없습니다.",
        result: []
      });
    }

    // ✅ 첫 번째 결과 기반 요약 메시지 생성
    const first = result[0];
    const date = first.BASE_DATE;
    const gu = first.GU_NM;
    const time = first.TIME_SLOT;
    const count = Math.round(Number(first.TOT_LVPOP_CO)).toLocaleString();

    const msg = time
      ? `${date} 기준 ${gu} ${time}시의 생활인구는 약 ${count}명입니다.`
      : `${date} 기준 ${gu} 전체 생활인구는 약 ${count}명입니다.`;

    return res.status(200).json({
      success: true,
      status: "OK",
      message: msg,
      result
    });

  } catch (error) {
    console.error("서울 열린데이터 API 호출 오류:", error.message);
    return res.status(500).json({
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
