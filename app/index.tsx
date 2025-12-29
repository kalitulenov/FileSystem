// Импорт необходимых модулей
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
// Работа с файловой системой
import * as FileSystem from "expo-file-system";
// Шаринг файлов
import * as Sharing from "expo-sharing";
// Локальное хранилище
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function App() {
  // Состояние для отслеживания прогресса загрузки (0-100%)
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Состояние для хранения объекта возобновляемой загрузки
  const [download, setDownload] = useState<FileSystem.DownloadResumable | null>(
    null
  );

  // Флаги состояния загрузки
  const [isDownloading, setIsDownloading] = useState(false); // Идет ли загрузка
  const [isDownloaded, setIsDownloaded] = useState(false); // Завершена ли загрузка
  const [isPaused, setIsPaused] = useState(false); // На паузе ли загрузка

  // Callback-функция для отслеживания прогресса загрузки
  const callback = (progress: FileSystem.DownloadProgressData) => {
    const { totalBytesWritten, totalBytesExpectedToWrite } = progress;

    // Проверка на корректность ожидаемого размера файла
    if (!totalBytesExpectedToWrite || totalBytesExpectedToWrite <= 0) return;

    // Вычисление процента загрузки
    const percent = Math.floor(
      (totalBytesWritten / totalBytesExpectedToWrite) * 100
    );

    setDownloadProgress(percent);
  };

  // Эффект для инициализации загрузки при монтировании компонента =========
  useEffect(() => {
    const getDownloadable = async () => {
      try {
        console.log("getDownloadable");

        // Пытаемся получить сохраненную загрузку из локального хранилища
        const savedDownloadJSON = await AsyncStorage.getItem("download");

        if (savedDownloadJSON) {
          // Если есть сохраненная загрузка, восстанавливаем ее
          const savedDownload = JSON.parse(savedDownloadJSON);
          console.log("savedDownloadJSON");

          const downloadResumable = FileSystem.createDownloadResumable(
            savedDownload.url,
            savedDownload.fileUri,
            savedDownload.options ?? {},
            callback,
            savedDownload.resumeData // Данные для возобновления
          );

          setDownload(downloadResumable);
          setIsPaused(true); // Устанавливаем состояние паузы
          setIsDownloading(true); // Показываем, что загрузка была прервана
        } else {
          console.log("downloadResumable1");
          // Если нет сохраненной загрузки, создаем новую
          const downloadResumable = FileSystem.createDownloadResumable(
            "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // URL файла
            FileSystem.documentDirectory + "large.mp4", // Локальный путь для сохранения
            {}, // Дополнительные опции
            callback // Callback для прогресса
          );
          console.log("downloadResumable2=");

          setDownload(downloadResumable);
        }
      } catch (e) {
        console.log("Download init error:", e);
      }
    };

    getDownloadable();
    console.log("isDownloading=", isDownloading);

    // Функция очистки при размонтировании компонента
    return () => {
      if (isDownloading) {
        pauseDownload(); // Принудительная пауза при уходе со страницы
      }
    };
  }, []);

  // Функция для начала загрузки файла ================================
  // const downloadFile = async () => {
  //   console.log("downloadFile");
  //   setIsDownloading(true);
  //   // TODO: Реализовать вызов download.downloadAsync()
  //   // const {uri} = await download.downloadAsync();

  //   AsyncStorage.removeItem("download"); // Удаляем сохраненную загрузку
  //   setIsDownloaded(true); // Устанавливаем флаг завершенной загрузки
  // };

  const downloadFile = async () => {
    if (!download) return;

    setIsDownloading(true);
    setIsPaused(false);

    try {
      await download.downloadAsync(); // ✅ ЗАПУСК ЗАГРУЗКИ
      setIsDownloaded(true);
      setIsDownloading(false);
      AsyncStorage.removeItem("download");
    } catch (e) {
      console.log("Download error:", e);
    }
  };

  // Функция для приостановки загрузки ===============================
  const pauseDownload = async () => {
    console.log("pauseDownload");
    if (!download) return; // Защита от вызова при отсутствии объекта загрузки

    setIsPaused(true);
    const pauseState = await download.pauseAsync(); // Приостанавливаем загрузку
    AsyncStorage.setItem("download", JSON.stringify(download.savable())); // Сохраняем состояние
    console.log("Paused download");
  };

  // Функция для возобновления загрузки ================================
  const resumeDownload = async () => {
    console.log("resumeDownload");
    setIsPaused(false);
    // TODO: Реализовать вызов download.resumeAsync()
    // const { uri } = await download.resumeAsync();

    AsyncStorage.removeItem("download"); // Удаляем сохраненное состояние
    setIsDownloaded(true); // Устанавливаем флаг завершенной загрузки
  };

  // Функция для сброса загрузки =====================================
  const resetDownload = async () => {
    console.log("resetDownload");
    // Сбрасываем все состояния
    setIsDownloaded(false);
    setIsDownloading(false);
    setIsPaused(false);
    setDownloadProgress(0);

    AsyncStorage.removeItem("download"); // Очищаем хранилище

    // Создаем новый объект загрузки ==================================
    const downloadResumable = FileSystem.createDownloadResumable(
      "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      FileSystem.documentDirectory + "large.mp4",
      {},
      callback
    );
    setDownload(downloadResumable);
  };

  // Функция для экспорта/отправки файла ===============================
  const exportDownload = async () => {
    console.log("exportDownload");
    if (Platform.OS === "android") {
      // Для Android используем Storage Access Framework для выбора папки
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        // Читаем загруженный файл в формате base64
        const base64 = await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + "large.mp4",
          { encoding: FileSystem.EncodingType.Base64 }
        );

        // Создаем новый файл через SAF
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri, // Выбранная папка
          "large.mp4", // Имя файла
          "video/mp4" // MIME-тип
        );

        // Записываем данные в созданный файл
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } else {
      // Для iOS используем стандартный шаринг
      await Sharing.shareAsync(FileSystem.documentDirectory + "large.mp4");
    }
  };

  // Рендер интерфейса ================================================
  return (
    <View style={styles.container}>
      {/* Отображение прогресса загрузки */}
      {isDownloading && <Text>Progress: {downloadProgress}%</Text>}

      {/* Кнопка начала загрузки (показывается когда нет активной загрузки) */}
      {!isDownloading && !isPaused && (
        <Button title="Download" onPress={downloadFile} />
      )}

      {/* Кнопка паузы (показывается при активной загрузке) */}
      {isDownloading && !isPaused && (
        <Button title="Pause" onPress={pauseDownload} />
      )}

      {/* Кнопка возобновления (показывается при паузе) */}
      {isPaused && <Button title="Resume" onPress={resumeDownload} />}

      {/* Кнопка сброса (показывается при любой активности загрузки) */}
      {(isDownloading || isDownloaded) && (
        <Button title="Reset" onPress={resetDownload} />
      )}

      {/* Кнопка экспорта (показывается после завершения загрузки) */}
      {isDownloaded && <Button title="Export File" onPress={exportDownload} />}

      {/* Статус бар */}
      <StatusBar style="auto" />
    </View>
  );
}

// Стили компонента =================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center", // Горизонтальное выравнивание
    justifyContent: "center", // Вертикальное выравнивание
  },
});
