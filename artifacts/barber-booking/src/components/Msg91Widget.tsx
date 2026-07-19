import { useEffect } from "react";

declare global {
  interface Window {
    initSendOTP?: (config: any) => void;
  }
}

interface Msg91WidgetProps {
  onSuccess: (data: { message: string }) => void;
  onFailure?: (error: any) => void;
}

export function Msg91Widget({ onSuccess, onFailure }: Msg91WidgetProps) {
  useEffect(() => {
    const configuration = {
      widgetId: "366773707859333133323432",
      tokenAuth: "552017Td8Qszz8w6a5cfaffP1",
      success: (data: any) => {
        if (onSuccess) onSuccess(data);
      },
      failure: (error: any) => {
        if (onFailure) onFailure(error);
        console.error("MSG91 Failure:", error);
      },
    };

    const loadOtpScript = (urls: string[]) => {
      let i = 0;
      const attempt = () => {
        const s = document.createElement("script");
        s.src = urls[i];
        s.async = true;
        s.onload = () => {
          if (typeof window.initSendOTP === "function") {
            window.initSendOTP(configuration);
          }
        };
        s.onerror = () => {
          i++;
          if (i < urls.length) attempt();
        };
        document.body.appendChild(s);
      };
      attempt();
    };

    loadOtpScript([
      "https://control.msg91.com/app/assets/otp-provider/otp-provider.js",
    ]);
  }, [onSuccess, onFailure]);

  return <div id="msg91-widget-container" className="w-full min-h-[300px]"></div>;
}
