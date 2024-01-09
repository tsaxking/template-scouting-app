





export type LineProperties = {
    width: number;
    color: string;
};

export type FillProperties = {
    color: string;
};




export type ShapeProperties = Partial<{
    line: Partial<LineProperties>;
    fill: Partial<FillProperties>;
}>;