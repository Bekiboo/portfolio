import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { writable } from 'svelte/store';

export const firebaseConfig = {
	apiKey: 'AIzaSyCEbOpOVwnt0hQapMxEz5G45-0oZsVl4Xo',
	authDomain: 'portfolio-d1544.firebaseapp.com',
	projectId: 'portfolio-d1544',
	storageBucket: 'portfolio-d1544.appspot.com',
	messagingSenderId: '990416389753',
	appId: '1:990416389753:web:6736049ba961027fdb36a8',
	measurementId: 'G-4232VSYRJH'
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();

/**
 * @returns a store with the current firebase user
 */
function userStore() {
	let unsubscribe: () => void;

	if (!auth || !globalThis.window) {
		console.warn('Auth is not initialized or not in browser');
		const { subscribe } = writable<User | null>(null);
		return {
			subscribe
		};
	}

	const { subscribe } = writable(auth?.currentUser ?? null, (set) => {
		unsubscribe = onAuthStateChanged(auth, (user) => {
			set(user);
		});

		return () => unsubscribe();
	});

	return {
		subscribe
	};
}

export const user = userStore();
