const languageIdMap = {
  Python: 71,
  JavaScript: 63,
  Java: 62,
  "C++": 54,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildJudge0Headers = () => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (process.env.JUDGE0_API_KEY) {
    headers["X-RapidAPI-Key"] = process.env.JUDGE0_API_KEY;
    headers["X-RapidAPI-Host"] = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";
  }

  return headers;
};

const executeCode = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { sourceCode, language, stdin = "" } = req.body;

    if (!sourceCode || typeof sourceCode !== "string") {
      return res.status(400).json({ message: "sourceCode is required" });
    }

    if (!language || !languageIdMap[language]) {
      return res.status(400).json({ message: "Unsupported language for execution" });
    }

    const judge0BaseUrl = process.env.JUDGE0_BASE_URL || "https://ce.judge0.com";
    const headers = buildJudge0Headers();

    const submitResponse = await fetch(
      `${judge0BaseUrl}/submissions?base64_encoded=false&wait=true&fields=status_id,status,stdout,stderr,compile_output,message,time,memory,token`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          language_id: languageIdMap[language],
          source_code: sourceCode,
          stdin,
        }),
      }
    );

    if (!submitResponse.ok) {
      const errorBody = await submitResponse.text();
      return res.status(502).json({ message: "Code execution provider unavailable", details: errorBody });
    }

    const submitData = await submitResponse.json();
    let resultData = submitData;

    if (resultData?.status_id <= 2) {
      if (!submitData?.token) {
        return res.status(502).json({ message: "Execution token was not returned" });
      }

      for (let pollAttempt = 0; pollAttempt < 20; pollAttempt += 1) {
        await sleep(500);

        const resultResponse = await fetch(
          `${judge0BaseUrl}/submissions/${submitData.token}?base64_encoded=false&fields=status_id,status,stdout,stderr,compile_output,message,time,memory`,
          {
            method: "GET",
            headers,
          }
        );

        if (!resultResponse.ok) {
          const errorBody = await resultResponse.text();

          if (resultResponse.status === 429 || resultResponse.status >= 500) {
            continue;
          }

          return res.status(502).json({ message: "Execution result polling failed", details: errorBody });
        }

        resultData = await resultResponse.json();

        if (resultData?.status_id > 2) {
          break;
        }
      }
    }

    return res.status(200).json({
      result: {
        status: resultData?.status?.description || "Unknown",
        statusId: resultData?.status_id,
        stdout: resultData?.stdout || "",
        stderr: resultData?.stderr || "",
        compileOutput: resultData?.compile_output || "",
        message: resultData?.message || "",
        time: resultData?.time || null,
        memory: resultData?.memory || null,
      },
    });
  } catch (error) {
    console.error("Execute code error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  executeCode,
};