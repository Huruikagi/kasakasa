import GmailThread = GoogleAppsScript.Gmail.GmailThread;

/** Bot返信メールで使う名前だよ。 */
const BOT_FROM_NAME = "kasakasa-Bot☂️";
/** チェック済みのメールに付与するGmailラベルの名前だよ。 */
const BOT_READ_LABEL_NAME = "BOT_READ";
/** OpenWeatherMapで検索する対象の都市 */
const CITY = "Shinjuku,JP";

/**
 * GASだとメール通知を拾ったりはできないのでこの関数を定期的に実行することで
 * 日報が来ているかどうかをチェックするよ。
 */
function kasakasa() {

    // 24時間以内にBotあてに来たメールを検索
    const query = `subject:("日報/") to:(${SECRETS.botAddress}) -label:(${BOT_READ_LABEL_NAME}) newer_than:1d`;

    // 検索実行。Botが返信済みのものは除外しておく。
    const todayDailyReports: GmailThread[] = GmailApp.search(query, 0, 1)
        .filter((thread) => !thread.getMessages().some(
            (message) => message.getFrom() === `"${BOT_FROM_NAME}" <${SECRETS.botAddress}>`));

    // 誰も見つからなかったらここで処理終了
    if (todayDailyReports.length === 0) { return; }

    // 対象のスレッドにラベルを張り付けておく
    const label = GmailApp.getUserLabelByName(BOT_READ_LABEL_NAME);
    todayDailyReports.forEach((thread) => thread.addLabel(label));

    // OpenWeatherMapのAPIを呼び出す
    const currentWeather = getCurrentWeather();

    // OpenWeatherMap的にidが800未満だと悪天候
    if (currentWeather.weather.some((w) => w.id < 800)) {
        const response = createResponseBody(currentWeather);
        todayDailyReports.forEach((thread) => thread.getMessages()[0].reply(response, {
            from: SECRETS.botAddress,
            name: BOT_FROM_NAME,
        }));
    }
}

/** OpenWeatherMapのAPIを叩いて天気情報を取ってくる。 */
function getCurrentWeather(): IWeatherSearchResponse {
    const url =
        `http://api.openweathermap.org/data/2.5/weather?q=${CITY}&APPID=${SECRETS.openWeatherMapApiKey}`;
    const fetchResponse = UrlFetchApp.fetch(url).getContentText("UTF-8");
    return JSON.parse(fetchResponse) as IWeatherSearchResponse;
}

/** 返信メールの本文を作る。 */
function createResponseBody(currentWeather: IWeatherSearchResponse): string {
    return "雨降ってるかも。傘持って帰りませんか。\n\n直近の天気：" +
        currentWeather.weather.reduce((acc, cur) => acc + "\n" + cur.description, "")
        + "\nhttps://openweathermap.org/city/1850144"
        + "\n\ngithub: https://github.com/Huruikagi/kasakasa";
}

/** OpenWeatherMap current APIのレスポンス形式（使うとこだけ） */
interface IWeatherSearchResponse {
    weather: Array<{
        "id": number,
        "main": string,
        "description": string,
    }>;
}

/** みせられない設定情報はこんな感じ */
interface ISecretConfig {
    /** APIキー */
    openWeatherMapApiKey: string;
    /** メールの返信時に使うGmailエイリアス */
    botAddress: string;
}
