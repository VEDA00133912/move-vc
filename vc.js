const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, Events } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vc-create')
        .setDescription('指定されたカテゴリーにcreate-vcボイスチャンネルを作成します')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false)
        .addChannelOption(option =>
            option.setName('category')
                .setDescription('ボイスチャンネルを作成するカテゴリーを選択してください')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)),
  
    async execute(interaction) {
        const category = interaction.options.getChannel('category');
      
        const botPermissions = interaction.guild.members.me.permissions;
        if (!botPermissions.has(PermissionFlagsBits.ManageChannels) || !botPermissions.has(PermissionFlagsBits.Connect || !botPermissions.has(PermissionFlagsBits.MoveMembers)) {
            return await interaction.reply({ content: 'チャンネル管理、接続、メンバー移動権限がないため、チャンネルを作成できません。', ephemeral: true });
        }

        const voiceChannel = await interaction.guild.channels.create({
            name: 'create-vc',
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                },
            ],
        });

        await interaction.reply({
            content: `${voiceChannel.toString()}が**${category.name}**カテゴリーに作成されました`,
            ephemeral: true
        });

        const voiceCollector = async (oldState) => {
            if (oldState.channelId !== voiceChannel.id || oldState.member?.user.bot) return;
            
            const member = oldState.member;
            const newChannelName = member.user.username;

            const tempVoiceChannel = await interaction.guild.channels.create({
                name: newChannelName,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: voiceChannel.permissionOverwrites.cache.map(overwrite => ({
                    id: overwrite.id,
                    allow: overwrite.allow,
                    deny: overwrite.deny,
                })),
            });

            await member.voice.setChannel(tempVoiceChannel);

            const tempCollector = (oldState) => {
                if (oldState.channelId === tempVoiceChannel.id && tempVoiceChannel.members.size === 0) {
                    tempVoiceChannel.delete().then(() => {
                        console.log(`一時的なボイスチャンネル「${newChannelName}」を削除しました。`);
                        interaction.client.removeListener(Events.VoiceStateUpdate, tempCollector);
                    });
                }
            };

            interaction.client.on(Events.VoiceStateUpdate, tempCollector);
        };

        interaction.client.on(Events.VoiceStateUpdate, voiceCollector);
    },
};
