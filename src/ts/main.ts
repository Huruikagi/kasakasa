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
        .filter((thread) => thread); // 見つからなかった分を除去

    // 誰も見つからなかったらここで処理終了
    if (todayDailyReports.length === 0) { return; }

    // 対象のスレッドにラベルを張り付けておく
    const label = GmailApp.getUserLabelByName(BOT_READ_LABEL_NAME);
    todayDailyReports.forEach((thread) => thread.addLabel(label));

    if (isRainy()) {
        // TODO: 雨降ってるよ通知
    }
}

/**
 * GASは同期的にやるのでコールバック関数は不要だよ。
 * @return 雨降ってたらtrue
 */
function isRainy(): boolean {
    // TODO: 天気APIに接続して雨が降っているか確認
    return true;
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

/** みせられない設定情報はこんな感じ */
interface ISecretConfig {
    /** 名前とか場所とかの設定情報を保存するスプレッドシート */
    spreadSheetId: string;
}
