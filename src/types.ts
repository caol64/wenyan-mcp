export type OutputType = "text";

export interface OutputObject {
    type: OutputType;
    text: string;
}

export interface ResponseObject {
    content: OutputObject[];
}
