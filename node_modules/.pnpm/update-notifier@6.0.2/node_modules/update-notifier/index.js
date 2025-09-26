import UpdateNotifier from './update-notifier.js';

export default function updateNotifier(options) {
	const updateNotifier = new UpdateNotifier(options);
	updateNotifier.check();
	return updateNotifier;
}
