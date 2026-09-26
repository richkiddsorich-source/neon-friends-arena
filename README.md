# Neon Friends Arena

A complete browser multiplayer party game for 2–7 friends.

## Included
- Real-time multiplayer using Socket.IO
- 2 modes: Neon Circuit racing + Power Brawl fighting
- Up to 7 players per room
- Room-code system
- Gamepad/controller support through the browser Gamepad API
- Keyboard support: WASD + A/B/X/Y
- Touch controls on phones
- Character roster: VOLT, NOVA, BLAZE, FROST, RUSH, SHADOW, TITAN
- Character colors and basic combat abilities
- Server-authoritative room/lobby state
- Mobile-friendly interface

## Run it
Requires Node.js 18+.

```bash
npm install
npm start
```

Then open:
http://localhost:3000

For friends on the same Wi-Fi, use the host phone/computer's local IP with port 3000.

For internet play, deploy this Node.js project to a service that supports long-lived Node/Socket.IO connections (for example Render, Railway, Fly.io, a VPS, or another Node host). Static-only hosting such as basic GitHub Pages will not run the multiplayer server.

## Controls
### Racing
- Keyboard: W/S accelerate/reverse, A/D steer, B boost
- Controller: left stick steer/accelerate, A boost
- Phone: virtual stick + B

### Fighting
- Keyboard: WASD move; A/B/X/Y attack abilities
- Controller: left stick move; A/B/X/Y abilities
- Phone: virtual stick + A/B/X/Y

## Notes
This is intentionally built as a lightweight party-game foundation so the rules, maps, characters, art, sound, weapons, power-ups, matchmaking and scoring can be expanded later.
