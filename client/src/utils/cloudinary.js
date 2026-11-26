const WIDGET_SCRIPT_URL =
  "https://upload-widget.cloudinary.com/latest/global/all.js";

let scriptLoadingPromise = null;

// Cloudinary Upload Widget 스크립트 로드
function loadCloudinaryScript() {
  if (window.cloudinary) {
    return Promise.resolve(window.cloudinary);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${WIDGET_SCRIPT_URL}"]`
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(window.cloudinary));
      existing.addEventListener("error", () =>
        reject(new Error("Cloudinary 스크립트 로드 실패"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.cloudinary);
    script.onerror = () => reject(new Error("Cloudinary 스크립트 로드 실패"));
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * 업로드 위젯 열기
 * @param {{ multiple?: boolean, maxFiles?: number }} options
 * @returns {Promise<string|string[]>} multiple이면 URL 배열, 아니면 단일 URL
 */
export async function openCloudinaryWidget({
  multiple = false,
  maxFiles = 1,
} = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary 설정이 없습니다. .env 에 VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET 을 추가해 주세요."
    );
  }

  const cloudinary = await loadCloudinaryScript();

  return new Promise((resolve, reject) => {
    let settled = false;
    const uploaded = [];

    const widget = cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ["local", "url", "camera"],
        multiple: Boolean(multiple),
        maxFiles: multiple ? Math.max(1, maxFiles) : 1,
        resourceType: "image",
        clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
        maxFileSize: 5_000_000,
        folding: false,
      },
      (error, result) => {
        if (settled) return;

        if (error) {
          settled = true;
          reject(error);
          return;
        }

        if (result?.event === "success") {
          const imageUrl = result.info?.secure_url || result.info?.url || "";
          if (imageUrl) uploaded.push(imageUrl);

          if (!multiple) {
            settled = true;
            if (!imageUrl) {
              reject(new Error("업로드된 이미지 URL을 찾지 못했습니다."));
              return;
            }
            resolve(imageUrl);
            widget.close();
          }
          return;
        }

        if (result?.event === "close") {
          settled = true;
          if (uploaded.length === 0) {
            reject(new Error("UPLOAD_CANCELLED"));
            return;
          }
          resolve(multiple ? uploaded : uploaded[0]);
        }
      }
    );

    widget.open();
  });
}
