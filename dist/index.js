"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const scratch_1 = require("./scratch");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const client = new discord_js_1.Client({
    intents: [discord_js_1.IntentsBitField.Flags.Guilds],
});
let database = {};
const getRamdomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min) + min);
};
client.on("ready", () => {
    var _a, _b;
    console.log(`Logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}`);
    (_b = client.application) === null || _b === void 0 ? void 0 : _b.commands.set([
        new discord_js_1.SlashCommandBuilder()
            .setName("authcreate")
            .setDescription("認証埋め込みの作成を行います。")
            .addChannelOption((option) => option
            .setName("channel")
            .setRequired(false)
            .setDescription("チャンネルを選択してください")),
    ]);
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        (_c = client.user) === null || _c === void 0 ? void 0 : _c.setPresence({
            activities: [
                {
                    name: `${client.ws.ping} ms | Node.js ${process.version}`,
                    type: discord_js_1.ActivityType.Watching,
                },
            ],
            status: "dnd",
        });
    }), 1000);
});
client.on("interactionCreate", (i) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    if (i.isChatInputCommand()) {
        if (i.commandName === "authcreate") {
            if (!((_a = i.memberPermissions) === null || _a === void 0 ? void 0 : _a.has("Administrator")))
                return;
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle("Scratch認証")
                .setDescription("下の「認証」ボタンを押して、ScratchのアカウントとDiscordアカウントの紐付けを開始してください。")
                .setColor("Green");
            const button = new discord_js_1.ButtonBuilder()
                .setCustomId("start")
                .setLabel("認証")
                .setStyle(discord_js_1.ButtonStyle.Success);
            const row = new discord_js_1.ActionRowBuilder().addComponents(button);
            const selectchannel = i.options.getChannel("channel");
            const channel = selectchannel ? selectchannel : i.channel;
            if ((channel === null || channel === void 0 ? void 0 : channel.type) === discord_js_1.ChannelType.GuildText) {
                channel.send({ embeds: [embed], components: [row] });
                i.reply({
                    content: `<#${channel === null || channel === void 0 ? void 0 : channel.id}>に認証埋め込みを生成しました。`,
                    ephemeral: true
                });
            }
            else {
                i.reply({
                    content: "このコマンドはテキストチャンネルでのみ使用できます。",
                    ephemeral: true
                });
            }
        }
    }
    if (i.isButton()) {
        if (i.customId.startsWith("auth_")) {
            let uuid = i.customId.slice(5, 15), scratchId = i.customId.slice(16);
            yield i.deferReply({ ephemeral: true });
            const { data } = yield (0, axios_1.default)({
                url: `https://clouddata.scratch.mit.edu/logs?projectid=${process.env.PROJECT_ID}&limit=40&offset=0`,
                responseType: "json",
                method: "get",
            });
            if (data.find((elem) => elem.value === uuid &&
                elem.user === scratchId)) {
                i.followUp("認証が完了しました。");
                s.curator("31009600", scratchId);
                if ((_b = i.channel) === null || _b === void 0 ? void 0 : _b.isTextBased()) {
                    ((_c = i.member) === null || _c === void 0 ? void 0 : _c.roles).add(process.env.ROLE_ID);
                    const embed = new discord_js_1.EmbedBuilder()
                        .setTitle("認証完了")
                        .setColor("Green")
                        .addFields({ name: "scratchユーザ名", value: `[${scratchId}](https://scratch.mit.edu/users/${scratchId})` }, { name: "Discordユーザ名", value: `${(_d = i.user) === null || _d === void 0 ? void 0 : _d.tag}(<@!${(_e = i.user) === null || _e === void 0 ? void 0 : _e.id}>)` }, { name: "DiscordユーザID", value: (_f = i.user) === null || _f === void 0 ? void 0 : _f.id }, { name: "検証用ID", value: uuid }, { name: "認証日時", value: new Date().toLocaleString() });
                    const channel = (_g = i.guild) === null || _g === void 0 ? void 0 : _g.channels.cache.get(process.env.LOG_CHANNEL_ID);
                    if (channel && channel.isTextBased()) {
                        channel.send({ embeds: [embed] });
                    }
                }
            }
            else {
                console.log(data, uuid, scratchId);
                i.followUp("認証に失敗しました。ユーザー名が正しいかどうかを確認してください。");
            }
        }
        if (i.customId === "start") {
            const modal = new discord_js_1.ModalBuilder().setCustomId("auth").setTitle("scratch認証");
            const username_input = new discord_js_1.TextInputBuilder()
                .setCustomId('username')
                .setLabel("Scratchのユーザー名を入力してください")
                .setStyle(discord_js_1.TextInputStyle.Short);
            const username_row = new discord_js_1.ActionRowBuilder().addComponents(username_input);
            modal.addComponents(username_row);
            yield i.showModal(modal);
        }
    }
    if (i.isModalSubmit()) {
        if (i.customId === "auth") {
            let scratchId = i.fields.getTextInputValue("username");
            let uuid = getRamdomInt(1e9, 1e10 - 1).toString();
            yield i.deferReply({ ephemeral: true });
            (0, axios_1.default)({
                url: `https://api.scratch.mit.edu/users/${encodeURIComponent(scratchId)}`,
                responseType: "json",
                method: "get",
            }).then(() => {
                const embed = new discord_js_1.EmbedBuilder()
                    .setTitle("認証コード")
                    .setDescription(`\`\`\`\n${uuid}\n\`\`\``)
                    .setColor("Green");
                const auth = new discord_js_1.ButtonBuilder()
                    .setCustomId("auth_" + uuid + "_" + scratchId)
                    .setLabel("プロジェクトに入力しました")
                    .setStyle(discord_js_1.ButtonStyle.Success);
                const row = new discord_js_1.ActionRowBuilder().addComponents(auth);
                i.editReply({
                    content: `ユーザー名の確認ができました。\n次に、下のコード(\`XXXXXXXXX\`形式)を、 https://scratch.mit.edu/projects/${process.env.PROJECT_ID}/fullscreen/ に入力してください。`,
                    embeds: [embed],
                    components: [row],
                });
            }).catch((e) => {
                i.reply({
                    ephemeral: true,
                    content: "有効なユーザー名を入力してください"
                });
            });
        }
    }
}));
const s = new scratch_1.scratch(String(process.env.SCRATCH_USER_NAME), String(process.env.SCRATCH_USER_PASSWORD));
s.on("login", () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if ((yield promises_1.default.stat(path_1.default.join(__dirname, "../data/"))).isDirectory()) {
        }
    }
    catch (e) {
    }
    client.login(process.env.TOKEN);
}));
