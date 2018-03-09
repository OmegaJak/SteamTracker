# SteamTracker
SteamTracker is a desktop application that aims to provide a detailed history of playtime in Steam games. Each time it is opened, it compares what it knows to data provided via the Steam API. 

For example, if last time it ran, you had 2 hours in a game, but now the Steam API says you've played the game for 4 hours, it SteamTracker knows that you've played the game for 2 hours between when it last run and now. It then saves this data in a json.

Ultimately, it will provide detailed analysis of game playtimes via graphs and other statistics.

SteamTracker is built upon Electron, allowing it to be written using TypeScript, HTML, and CSS. It uses Vue as a framework.