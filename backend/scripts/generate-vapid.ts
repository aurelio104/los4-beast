import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\n🔑 VAPID Keys — añade a backend/.env:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_MAILTO=mailto:admin@los4.local\n');
