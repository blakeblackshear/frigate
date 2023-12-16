type CardsData = {
    [key: string]: {
        [key: string]: {
            [key: string]: Card
        }
    }
}

type Card = {
    camera: string,
    time: number,
    entries: Timeline[],
}

type Preview = {
    camera: string,
    src: string,
    type: string,
    start: number,
    end: number,
}

type Timeline = {
    camera: string,
    timestamp: number,
    data: {
        [key: string]: any
    },
    class_type: string,
    source_id: string,
    source: string,
}

type HourlyTimeline = {
    start: number,
    end: number,
    count: number,
    hours: { [key: string]: Timeline[] };
}