/**
 * HTML transcript files for the transcript channel and the closed DM (Ticket Tool parity, batch A).
 * Built with the same template as /transcript. Anonymous tickets are always anonymised, as with /transcript:
 * the real staff names are only kept in the database.
 */

const { AttachmentBuilder } = require('discord.js');

/** What the transcript template needs */
const TRANSCRIPT_INCLUDE = {
	archivedChannels: true,
	archivedMessages: {
		orderBy: { createdAt: 'asc' },
		where: { external: false },
	},
	archivedRoles: true,
	archivedUsers: true,
	category: true,
	claimedBy: true,
	closedBy: true,
	createdBy: true,
	feedback: true,
	guild: true,
	questionAnswers: { include: { question: true } },
};

/**
 * Who gets a transcript file when a ticket closes.
 * @param {{ archive: boolean }} categorySettings resolved category settings
 * @param {{ transcriptChannel?: string | null, transcriptDm?: boolean }} guild
 * @returns {{ channel: boolean, dm: boolean }}
 */
function transcriptTargets(categorySettings, guild) {
	if (!categorySettings.archive) {
		return {
			channel: false,
			dm: false,
		};
	}
	return {
		channel: Boolean(guild.transcriptChannel),
		dm: Boolean(guild.transcriptDm),
	};
}

/**
 * @param {import('../../client')} client
 * @param {string} ticketId
 * @returns {Promise<AttachmentBuilder | null>}
 */
async function buildTranscriptAttachment(client, ticketId) {
	const command = client.commands?.commands.slash.get('transcript');
	const ticket = await client.prisma.ticket.findUnique({
		include: TRANSCRIPT_INCLUDE,
		where: { id: ticketId },
	});
	if (!command || !ticket) return null;
	const {
		fileName,
		transcript,
	} = await command.fillTemplate(ticket, { anonymise: Boolean(ticket.category?.anonymous) });
	return new AttachmentBuilder()
		.setFile(Buffer.from(transcript))
		.setName(fileName);
}

module.exports = {
	TRANSCRIPT_INCLUDE,
	buildTranscriptAttachment,
	transcriptTargets,
};
