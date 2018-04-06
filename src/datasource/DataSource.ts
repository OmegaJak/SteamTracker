import { GameMap } from "../Game";

export default interface DataSource {
	readonly srcName: string;
	getData(): Promise<GameMap>;
}
