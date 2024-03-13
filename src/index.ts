import {
    Client,
    IntentsBitField,
    ActivityType,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputStyle,
    TextInputBuilder,
    GuildMemberRoleManager,
    TextChannel,
    ChannelType,
} from "discord.js";
import dotenv from "dotenv";
import axios from "axios";
import { scratch } from "./scratch"
import fs from "fs/promises"
import path from "path"

dotenv.config();

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds],
});

interface clouddata {
    user: string;
    verb: string;
    name: string;
    value: string;
    timestamp: number;
}

let database = {};

const getRamdomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min) + min);
}

client.on("ready", () => {
    console.log(`Logged in as ${client.user?.tag}`);
    client.application?.commands.set([
        new SlashCommandBuilder()
            .setName("authcreate")
            .setDescription("認証埋め込みの作成を行います。")
            .addChannelOption((option) =>
                option
                    .setName("channel")
                    .setRequired(false)
                    .setDescription("チャンネルを選択してください")
            ),
    ]);
    setInterval(async () => {
        client.user?.setPresence({
            activities: [
                {
                    name: `${client.ws.ping} ms | Node.js ${process.version}`,
                    type: ActivityType.Watching,
                },
            ],
            status: "dnd",
        });
    }, 1000);
});

client.on("interactionCreate", async (i) => {
    if (i.isChatInputCommand()) {
        if (i.commandName === "authcreate") {
            if (!i.memberPermissions?.has("Administrator")) return;
            const embed = new EmbedBuilder()
                .setTitle("Scratch認証")
                .setDescription(
                    "下の「認証」ボタンを押して、ScratchのアカウントとDiscordアカウントの紐付けを開始してください。"
                )
                .setColor("Green");
            const button = new ButtonBuilder()
                .setCustomId("start")
                .setLabel("認証")
                .setStyle(ButtonStyle.Success);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
            const selectchannel = i.options.getChannel("channel");
            const channel = selectchannel ? selectchannel : i.channel;
            if (channel?.type === ChannelType.GuildText) {
                (channel as TextChannel).send({ embeds: [embed], components: [row] });
                i.reply({
                    content: `<#${channel?.id}>に認証埋め込みを生成しました。`,
                    ephemeral: true
                });
            } else {
                i.reply({
                    content: "埋め込みのチャンネルはテキストチャンネルでのみ使用できます。",
                    ephemeral: true
                });
            }
        }
    }
    if (i.isButton()) {
        if (i.customId === "start") {
            const modal = new ModalBuilder().setCustomId("auth").setTitle("scratch認証")
            const username_input = new TextInputBuilder()
                .setCustomId('username')
                .setLabel("Scratchのユーザー名を入力してください")
                .setStyle(TextInputStyle.Short);
            const username_row = new ActionRowBuilder<TextInputBuilder>().addComponents(username_input);
            modal.addComponents(username_row);
            await i.showModal(modal);
        }
        if (i.customId.startsWith("auth_")) {
            let uuid = i.customId.slice(5, 15), scratchId = i.customId.slice(16);
            await i.deferReply({ ephemeral: true });
            const { data } = await axios({
                url: `https://clouddata.scratch.mit.edu/logs?projectid=${process.env.PROJECT_ID}&limit=40&offset=0`,
                responseType: "json",
                method: "get",
            });
            if (data.find((elem: clouddata) =>
                elem.value === uuid &&
                elem.user === scratchId
            )) {
                const embed = new EmbedBuilder()
                    .setTitle("認証完了")
                    .setDescription("認証が完了しました。")
                    .setColor("Green");
                i.editReply({ embeds: [embed] });
                s.curator("31009600", scratchId);
                (i.member?.roles as GuildMemberRoleManager).add(process.env.ROLE_ID as string);
                const embed_log = new EmbedBuilder()
                    .setTitle("認証完了")
                    .setColor("Green")
                    .addFields(
                        { name: "scratchユーザ名", value: `[${scratchId}](https://scratch.mit.edu/users/${scratchId})` },
                        { name: "Discordユーザ名", value: `${i.user?.tag}(<@!${i.user?.id}>)` },
                        { name: "DiscordユーザID", value: i.user?.id },
                        { name: "検証用ID", value: uuid },
                        { name: "認証日時", value: new Date().toLocaleString() },
                    )
                const channel = i.guild?.channels.cache.get(process.env.LOG_CHANNEL_ID as string) as TextChannel;
                if (channel && channel.isTextBased()) {
                    channel.send({ embeds: [embed_log] });
                }
            } else {
                const embed = new EmbedBuilder()
                    .setTitle("認証失敗")
                    .setDescription("認証に失敗しました。")
                    .setColor("Red");
                i.editReply({ embeds: [embed] });
            }
        }
    }
    if (i.isModalSubmit()) {
        if (i.customId === "auth") {
            let scratchId: string = i.fields.getTextInputValue("username");
            let uuid: string = getRamdomInt(1e9, 1e10 - 1).toString();
            await i.deferReply({ ephemeral: true });
            axios({
                url: `https://api.scratch.mit.edu/users/${encodeURIComponent(scratchId)}`,
                responseType: "json",
                method: "get",
            }).then(() => {
                const embed = new EmbedBuilder()
                    .setTitle("認証コードを入力")
                    .setDescription(`ユーザー名の確認ができました。\n次に、下のコード(\`XXXXXXXXX\`形式)を、 [このプロジェクト](https://scratch.mit.edu/projects/${process.env.PROJECT_ID}/fullscreen/)に入力してください。`)
                    .addFields({ name: "認証コード", value: `\`\`\`\n${uuid}\n\`\`\`` })
                    .setColor("Green");
                const auth = new ButtonBuilder()
                    .setCustomId("auth_" + uuid + "_" + scratchId)
                    .setLabel("プロジェクトに入力しました")
                    .setStyle(ButtonStyle.Success);
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(auth);
                i.editReply({ embeds: [embed], components: [row] });
            }).catch(() => {
                const embed = new EmbedBuilder()
                    .setTitle("エラー発生")
                    .setDescription("有効なユーザー名を入力してください。")
                    .setColor("Red");
                i.editReply({ embeds: [embed] });
            });
        }
    }
});

const s = new scratch(String(process.env.SCRATCH_USER_NAME), String(process.env.SCRATCH_USER_PASSWORD));
s.on("login", async () => {
    try {
        if ((await fs.stat(path.join(__dirname, "../data/"))).isDirectory()) {

        }
    } catch (e) {
    }
    client.login(process.env.TOKEN);
})