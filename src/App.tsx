import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Container = styled.div`
  display: flex;
  height: 100vh;
`;

const LeftSide = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f0f4f8;
  padding: 20px;
`;

const Center = styled.div`
  background-color: #f0f4f8;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const RightSide = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f0f4f8;
  padding: 20px;
`;

const ButtonArea = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const Button = styled.button`
  margin: 10px;
  padding: 15px 25px;
  font-size: 16px;
  cursor: pointer;
  border: none;
  border-radius: 25px;
  background: linear-gradient(145deg, #e6e6e6, #ffffff);
  box-shadow: 6px 6px 12px #cfcfcf, -6px -6px 12px #ffffff;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 4px 4px 10px #cfcfcf, -4px -4px 10px #ffffff;
  }

  &:active {
    box-shadow: inset 4px 4px 10px #cfcfcf, inset -4px -4px 10px #ffffff;
  }
`;

const CircleContainer = styled.div`
  width: 150px;
  height: 150px;
  margin-top: 20px;
`;

const TimestampDisplay = styled.div`
  font-size: 18px;
  text-align: center;
`;

const Label = styled.label`
  font-size: 18px;
  margin-top: 10px;
  margin-bottom: 5px;
  color: #333;
`;

const InputField = styled.input`
  width: 100%;
  padding: 15px;
  font-size: 16px;
  border: none;
  border-radius: 25px; /* Rounded corners */
  background-color: #f0f0f0;
  box-shadow: inset 5px 5px 10px #cbced1, inset -5px -5px 10px #fff;
  color: #333;
  margin-bottom: 20px;
`;

const SettingInputField = styled.input`
  width: 20%;
  padding: 15px;
  font-size: 16px;
  border: none;
  border-radius: 25px; /* Rounded corners */
  background-color: #f0f0f0;
  box-shadow: inset 5px 5px 10px #cbced1, inset -5px -5px 10px #fff;
  color: #333;
  margin-bottom: 20px;

  //矢印を非表示
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const CenterDisplay = styled.div`
  text-align: center;
  margin-top: 20px;
`;

// Web Worker のスクリプトを文字列として定義
const workerScript = `
  self.onmessage = function(e) {
    const duration = e.data; // duration は秒数
    console.log("Web Worker received duration:", duration);
    
    let percentage = 0;
    const increment = 100 / duration; // 全体の進捗を秒単位で計算
    console.log("Increment per second:", increment);

     // Worker のスレッドのユニークな識別子として、タイムスタンプを使ってみる
    const workerID = Date.now();
    
    const interval = setInterval(() => {
      percentage += increment;
      console.log("workerID:", workerID);
      console.log("Current percentage:", percentage);
      if (percentage >= 100) {
        percentage = 100;
        clearInterval(interval);
        console.log("Progress completed");
      }
      self.postMessage(percentage);
    }, 1000); // 1 秒ごとに進捗を更新
  };
`;

const App: React.FC = () => {
  const [percentage, setPercentage] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [startTimestamp, setStartTimestamp] = useState<string | null>(null);
  const [reStartTimestamp, setReStartTimestamp] = useState<string | null>(null);
  const [stopTimestamp, setStopTimestamp] = useState<string | null>(null);
  const [isStopped, setIsStopped] = useState(false);

  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [inputDuration, setInputDuration] = useState("1");
  const [duration, setDuration] = useState(60);

  const workerRef = useRef<Worker | null>(null);
  const [isWorkerInitialized, setIsWorkerInitialized] = useState(false);

  useEffect(() => {
    // Web Worker の初期化
    workerRef.current = new Worker(
      URL.createObjectURL(
        new Blob([workerScript], { type: "application/javascript" })
      )
    );

    // Worker からのメッセージを処理
    workerRef.current.onmessage = (event) => {
      setPercentage(event.data);
    };

    setIsWorkerInitialized(true);

    // コンポーネントのアンマウント時に Worker を終了
    return () => {
      workerRef.current?.terminate();
      setIsWorkerInitialized(false);
    };
  }, []);

  const handleDurationChange = () => {
    const integerPattern = /^[1-9]\d*$/;

    if (integerPattern.test(inputDuration)) {
      const newDuration = parseInt(inputDuration, 10);
      console.log("Parsed duration (minutes):", newDuration);
      if (Number.isInteger(newDuration) && newDuration > 0) {
        const durationInSeconds = newDuration * 60;
        console.log("Duration in seconds:", durationInSeconds);
        setDuration(durationInSeconds); // 分単位で設定し、秒単位に変換
        resetTimer(); // 新しい duration を設定後にタイマーをリセット

        // Web Worker が初期化されているかどうかの確認
        if (isWorkerInitialized) {
          if (workerRef.current) {
            console.log("Posting message to worker.");
            workerRef.current.postMessage({
              action: "updateDuration",
              duration: durationInSeconds,
            });
          } else {
            console.error("Worker reference is null.");
          }
        } else {
          console.error("Web Worker is not initialized.");
        }
      } else {
        toast.error("タイマー（分）は正の整数で設定してください");
        setInputDuration("1"); // 無効な入力の場合はデフォルト値に戻す
      }
    } else {
      toast.error("タイマー（分）は正の整数で設定してください");
      setInputDuration("1"); // 無効な入力の場合はデフォルト値に戻す
    }
  };

  const startTimer = () => {
    if (!isRunning) {
      console.log("Starting timer...");
      setIsRunning(true);
      setIsStopped(false);

      if (startTimestamp == null) {
        setStartTimestamp(new Date().toLocaleTimeString());
        console.log("Start timestamp set:", startTimestamp);
      } else {
        setReStartTimestamp(new Date().toLocaleTimeString());
        console.log("Restart timestamp set:", reStartTimestamp);
      }

      // Web Worker を使用して進捗バーを管理
      if (workerRef.current) {
        console.log("Posting duration to Web Worker:", duration);
        workerRef.current.postMessage(duration);
      }

      // 既存のタイマーをクリアする
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null; // 明示的にタイマーをリセット
      }

      // 新しいタイマーを設定する
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          console.log("Elapsed time:", newTime);
          return newTime;
        });
      }, 1000);
    }
  };

  const stopTimer = () => {
    if (isRunning) {
      setIsRunning(false);
      setIsStopped(true);
      setStopTimestamp(new Date().toLocaleTimeString());

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null; // 明示的にタイマーをリセット
      }

      // Worker の進捗バー処理を停止
      workerRef.current?.terminate();
      workerRef.current = null;
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setElapsedTime(0);
    setPercentage(0);
    setStartTimestamp(null);
    setReStartTimestamp(null);
    setStopTimestamp(null);
    setIsStopped(false);

    // 既存の Web Worker を終了
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    // Web Worker を再初期化
    workerRef.current = new Worker(
      URL.createObjectURL(
        new Blob([workerScript], { type: "application/javascript" })
      )
    );

    workerRef.current.onmessage = (event) => {
      setPercentage(event.data);
    };
  };

  const formatTime = (time: number) => {
    const getSeconds = `0${time % 60}`.slice(-2);
    const minutes = Math.floor(time / 60);
    const getMinutes = `0${minutes % 60}`.slice(-2);
    const getHours = `0${Math.floor(time / 3600)}`.slice(-2);
    return `${getHours}:${getMinutes}:${getSeconds}`;
  };

  const [headerToken, setHeaderToken] = useState("");
  const [headerContentType, setHeaderContentType] =
    useState("application/json");

  const [apiUrl, setApiUrl] = useState(
    "https://project-timer-backend.onrender.com/api/data"
  );
  const [appId, setAppId] = useState("");

  const [createUserName, setCreateUserName] = useState("");
  const [createUserCode, setCreateUserCode] = useState("");

  const [workDescription, setWorkDescription] = useState("");

  const [notes, setNotes] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectNum, setProjectNum] = useState("");

  const extractErrorMessages = (errors: {
    [x: string]: { messages: any[] };
  }) => {
    const extractedMessages: { field: string; message: any }[] = [];

    for (const key in errors) {
      if (errors[key].messages && errors[key].messages.length > 0) {
        errors[key].messages.forEach((message) => {
          extractedMessages.push({ field: key, message: message });
        });
      }
    }

    return extractedMessages;
  };

  const handleAPIPost = async () => {
    try {
      const headers: Record<string, string> = {};
      if (headerToken) headers["X-Cybozu-API-Token"] = headerToken;
      if (headerContentType) headers["Content-Type"] = headerContentType;

      const body = {
        app: appId,
        record: {
          Table: {
            type: "SUBTABLE",
            value: [
              {
                value: {
                  備考: {
                    type: "SINGLE_LINE_TEXT",
                    value: notes,
                  },
                  開始時刻: {
                    type: "TIME",
                    value: startTimestamp,
                  },
                  作業時間: {
                    type: "CALC",
                    value: `${Math.floor(elapsedTime / 3600)
                      .toString()
                      .padStart(2, "0")}:${Math.floor((elapsedTime % 3600) / 60)
                      .toString()
                      .padStart(2, "0")}`,
                  },
                  作業内容: {
                    type: "SINGLE_LINE_TEXT",
                    value: workDescription,
                  },
                  終了時刻: {
                    type: "TIME",
                    value: stopTimestamp,
                  },
                },
              },
            ],
          },
          更新者: {
            type: "MODIFIER",
            value: {
              code: createUserCode,
              name: createUserName,
            },
          },
          作成者: {
            type: "CREATOR",
            value: {
              code: createUserCode,
              name: createUserName,
            },
          },
          プロジェクト名: {
            type: "SINGLE_LINE_TEXT",
            value: projectName,
          },
          プロジェクトNo: {
            type: "NUMBER",
            value: projectNum,
          },
          日付: {
            type: "DATE",
            value: new Date().toISOString().split("T")[0],
          },
        },
      };
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        mode: "cors",
      });

      const result = await response.json();

      if (response.ok) {
        // 成功の場合
        let sucessResult = JSON.parse(result);
        toast.success(
          `API Request Successful: ID:${sucessResult.id} のレコードが追加されました`
        );
      } else {
        // エラーの場合
        let details = JSON.parse(result.details);
        let messages = extractErrorMessages(details.errors);
        messages.forEach((msg) => {
          toast.error(`Field: ${msg.field}, Message: ${msg.message}`);
        });
      }
    } catch (error) {
      console.log("error", error);
      toast.error(`API Error: ${(error as Error).message || String(error)}`);
    }
  };

  const handleViewKintone = () => {
    window.open("https://kintone.cybozu.co.jp/", "_blank");
  };

  return (
    <Container>
      <LeftSide>
        <Label>API Url</Label>
        <InputField
          placeholder="url  *必須"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
        />
        <Label>APP Id</Label>
        <InputField
          placeholder="app  *必須"
          value={appId}
          onChange={(e) => setAppId(e.target.value)}
        />
        <Label>Create User</Label>
        <InputField
          placeholder="作成者.name"
          value={createUserName}
          onChange={(e) => setCreateUserName(e.target.value)}
        />
        <InputField
          placeholder="作成者.code  *必須"
          value={createUserCode}
          onChange={(e) => setCreateUserCode(e.target.value)}
        />
      </LeftSide>
      <Center>
        <div>enjoy your task</div>
        <CircleContainer>
          <CircularProgressbar
            value={percentage}
            text={formatTime(elapsedTime)}
            styles={buildStyles({
              pathColor: `rgba(62, 152, 199, ${percentage / 100})`,
              textColor: "#000",
              trailColor: "#d6d6d6",
            })}
          />
        </CircleContainer>
        <ButtonArea>
          <Button onClick={startTimer} disabled={isRunning}>
            Start
          </Button>
          <Button
            onClick={isStopped ? resetTimer : stopTimer}
            disabled={!isRunning && !isStopped}
          >
            {isStopped ? "Reset" : "Stop"}
          </Button>
        </ButtonArea>
        <CenterDisplay>
          <TimestampDisplay>
            Start Time: {startTimestamp || "Not started yet"}
          </TimestampDisplay>
          {/* <TimestampDisplay>
            Re Start Time: {reStartTimestamp || "Not started yet"}
          </TimestampDisplay> */}
          <TimestampDisplay>
            Stop Time: {stopTimestamp || "Not stopped yet"}
          </TimestampDisplay>
          <div>
            <SettingInputField
              type="number"
              value={inputDuration}
              onChange={(e) => setInputDuration(e.target.value)}
              placeholder="分 単位"
            />
            <Button
              onClick={handleDurationChange}
              disabled={isRunning || isStopped}
            >
              設定
            </Button>
          </div>
        </CenterDisplay>
      </Center>
      <RightSide>
        <Label>API Headers</Label>
        <InputField
          placeholder="X-Cybozu-API-Token  *必須"
          value={headerToken}
          onChange={(e) => setHeaderToken(e.target.value)}
        />
        <Label>API Body</Label>
        <InputField
          placeholder="プロジェクトNo"
          value={projectNum}
          onChange={(e) => setProjectNum(e.target.value)}
        />
        <InputField
          placeholder="プロジェクト名"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <InputField
          placeholder="作業内容"
          value={workDescription}
          onChange={(e) => setWorkDescription(e.target.value)}
        />
        <InputField
          placeholder="備考"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div>
          <Button
            onClick={handleAPIPost}
            disabled={isRunning || !startTimestamp || !stopTimestamp}
          >
            POST API
          </Button>
          <Button onClick={handleViewKintone}>View kintone</Button>
        </div>
      </RightSide>
      <ToastContainer />
    </Container>
  );
};

export default App;
