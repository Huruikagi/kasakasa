import GmailThread = GoogleAppsScript.Gmail.GmailThread;
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
import Range = GoogleAppsScript.Spreadsheet.Range;

/** チェック済みのメールに付与するGmailラベルの名前だよ。 */
const BOT_READ_LABEL_NAME = "BOT_READ";
/** スプレッドシート中の「名前付き範囲」の値だよ */
enum RANGES {
    latitude = "latitude",
    longitude = "longitude",
    names = "userNames",
}
/** OpenWeatherMapで検索する対象の都市 */
const CITY = "Shinjuku,JP";
/** ユーザー名を設定するスプレッドシート中の「名前付き範囲」だよ */
const NAMES_RANGE = "userNames";

/** メインとなる関数の予定だよ。 */
function kasakasa() {
    // TODO: 定期実行
    onTime();
}

/**
 * GASだとメール通知を拾ったりはできないのでこの関数を定期的に実行することで
 * 日報が来ているかどうかをチェックするよ。
 */
function onTime() {

    const sourceSheet: Spreadsheet = SpreadsheetApp.openById(SECRETS.spreadSheetId);

    // 今日分の日報を検索する。
    const todayDailyReports: GmailThread[] = getTargetNames(sourceSheet)
        .map((userName) => {
            // 日付が今日で、まだチェックしていない分だけ確認
            const todayStr = dateStringOf(new Date());
            return `subject:(日報/${userName}/${todayStr}) -(label:${BOT_READ_LABEL_NAME})`;
        })
        .map((query) => GmailApp.search(query, 0, 1)[0])
        .filter((thread) => thread); // 見つからなかった分(=undefined)を除去

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
        todayDailyReports.forEach((thread) => thread.reply(response, {
            from: SECRETS.botAddress,
            name: "kasakasa-Bot☂️",
        }));
    }
}

/**
 * @param spreadsheet 対象となるいい感じにデータが入ったスプレッドシートオブジェクト
 * @return 記載されている氏名の配列
 */
function getTargetNames(spreadsheet: Spreadsheet): string[] {
    const names: string[] = [];
    const namesRange: Range = spreadsheet.getRangeByName(RANGES.names);
    for (let i = 1; i <= namesRange.getNumRows(); i++) {
        const value = namesRange.getCell(i, 1).getValue() as string;
        if (value) {
            names.push(value);
        } else {
            break;
        }
    }
    return names;
}

/**
 * 20190205形式の文字列を作るよ。JavaScriptには標準でformatがないよ。
 * @param date もととなる日付
 */
function dateStringOf(date: Date): string {
    const pud = (src: number) => {
        if (src < 10) {
            return "0" + src;
        } else {
            return src;
        }
    };
    const yyyy = date.getFullYear();
    const mm = pud(date.getMonth() + 1);
    const dd = pud(date.getDate());
    return `${yyyy}${mm}${dd}`;
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
    return currentWeather.weather.reduce((acc, cur) =>
        acc + "\n" + cur.description
    , "雨降ってるかも。傘持って帰りませんか。\n\n直近の天気：") +
    "\nhttps://openweathermap.org/city/1850144";
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
    /** 名前とか場所とかの設定情報を保存するスプレッドシート */
    spreadSheetId: string;
    /** APIキー */
    openWeatherMapApiKey: string;
    /** メールの返信時に使うGmailエイリアス */
    botAddress: string;
}
