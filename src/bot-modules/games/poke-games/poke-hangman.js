/*
 * Poke-Hangman
 */

'use strict';

const Path = require('path');

const Translator = Tools.get('translate.js');
const normalize = Tools.get('normalize.js');
const PokeRand = require(Path.resolve(__dirname, 'pokerand.js'));

const translator = new Translator(Path.resolve(__dirname, 'poke-hangman.translations'));

function isNotAlphanumeric(str) {
	return (/[^a-z0-9�]/g).test(str);
}

function toWordId(str) {
	if (!str) return '';
	str = normalize(str);
	return str.toLowerCase().replace(/[^a-z0-9\u00f1]/g, '');
}

function getLanguage(room) {
	return App.config.language.rooms[room] || App.config.language['default'];
}

class PokeHangman {
	constructor(room, maxFails) {
		this.room = room;

		let data = PokeRand.random();
		this.word = data.word;
		this.wordId = toWordId(this.word);
		this.clue = data.clue;

		this.fails = 0;
		this.maxFails = maxFails || 0;

		this.ended = false;
		this.said = [];
		this.status = [];
		let w = normalize(this.word).trim().toLowerCase();
		for (let i = 0; i < w.length; i++) {
			if (isNotAlphanumeric(w.charAt(i))) {
				this.status.push({type: 'sep', key: w.charAt(i)});
			} else {
				this.status.push({type: 'key', key: w.charAt(i), guessed: false});
			}
		}

		this.lang = getLanguage(this.room);
	}

	send(txt) {
		App.bot.sendTo(this.room, txt);
	}

	generateHangman() {
		let data = this.status;
		let chars = [];
		for (let i = 0; i < data.length; i++) {
			if (data[i].type === 'sep') {
				if (data[i].key === ' ') chars.push(' - ');
				else chars.push(' ' + data[i].key.toUpperCase() + ' ');
			} else if (data[i].type === 'key') {
				if (data[i].guessed) chars.push(data[i].key.toUpperCase());
				else chars.push(' _ ');
			}
		}
		return chars.join('');
	}

	start() {
		let txt = '';
		txt += '**Poke-Hangman:** ';
		txt += this.generateHangman();
		txt += ' | ';
		txt += '**' + this.clue + '** | ';
		txt += translator.get(0, this.lang) + " ``" + (App.config.parser.tokens[0] || "") +
			translator.get(1, this.lang) + "`` " + translator.get(2, this.lang) + ".";
		this.send(txt);
	}

	show() {
		let txt = '';
		txt += '**Poke-Hangman:** ';
		txt += this.generateHangman();
		txt += ' | ';
		txt += '**' + this.clue + '** | ';
		txt += this.said.sort().join(' ');
		this.send(txt);
	}

	guess(user, str) {
		if (this.ended) return;
		str = normalize(str);
		if (toWordId(str) === this.wordId) {
			this.end(user);
			return;
		}
		let c = str.trim().toLowerCase();
		if (c.length !== 1) {
			this.fails++;
			if (this.maxFails && this.fails > this.maxFails) {
				this.end(user, true);
			}
			return;
		}
		if (this.said.indexOf(c) >= 0 || isNotAlphanumeric(c)) return;
		this.said.push(c);
		let err = true, isCompleted = true;
		for (let i = 0; i < this.status.length; i++) {
			if (this.status[i].type === 'key' && !this.status[i].guessed) {
				if (this.status[i].key === c) {
					err = false;
					this.status[i].guessed = true;
				} else {
					isCompleted = false;
				}
			}
		}
		if (isCompleted) {
			this.end(user);
		} else if (err) {
			this.fails++;
			if (this.maxFails && this.fails > this.maxFails) {
				this.end(user, true);
			}
		} else {
			this.show();
		}
	}

	end(winner, lose) {
		let txt = '';
		this.ended = true;
		txt += translator.get(3, this.lang) + ' ';
		if (lose) {
			txt += winner + ' ' + translator.get(4, this.lang) + '! ';
		} else if (winner) {
			txt += translator.get(5, this.lang) + ' ' + winner + ' ' + translator.get(6, this.lang) + '! ';
		}
		txt += translator.get(7, this.lang) + ' __' + this.word + '__';
		this.send(txt);
		App.modules.games.system.terminateGame(this.room);
	}
}

module.exports = PokeHangman;
