import GmailThread = GoogleAppsScript.Gmail.GmailThread;

const BOT_READ_LABEL_NAME = "BOT_READ";

function kasakasa() {
    // TODO: 定期実行
    onTime();
}

function onTime() {

    // 今日分の日報を検索する。
    const todayDailyReports: GmailThread[] = getTargetNames()
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

function isRainy(): boolean {
    // TODO: 天気APIに接続して雨が降っているか確認
    return true;
}

function getTargetNames(): string[] {
    // TODO: スプレッドシートから取得
    return [
        "喜多剛士",
    ];
}

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
