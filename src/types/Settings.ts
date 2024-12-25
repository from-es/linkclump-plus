export type Settings = {
    actions: Record<string, Action>;
    blocked: string[];
}

export interface Action {
    mouse: number;
    key: number;
    action: string;
    color: string;
    options: {
        smart: number;
        ignore: number[];
        delay: number;
        close: number;
        block: boolean;
        reverse: boolean;
        end: boolean;
        fontsizeofcounter: number;
        fontweightofcounter: number;
        samebgcolorasbox: boolean;
    }
}
