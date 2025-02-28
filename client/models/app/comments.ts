export type CommentSection = {
    auto: string[];
    tele: string[];
    end: string[];
};

export const comments: {
    general: CommentSection;
    2025: CommentSection;
} = {
    general: {
        auto: ['Did not move in autonomous', 'Mobility only in auto'],
        tele: [
            '"Dead" after hard hit',
            'clever driver, adapts quickly',
            'Drove around aimlessly',
            'fast and maneuverable',
            'gets fouls hitting bots in protected zones',
            "gets in partner's way",
            'hits opponents very hard',
            'Mostly played defense',
            'Very slow'
        ],
        end: []
    },
    2025: {
        auto: [
            'crossed leave line',
            '1 coral auto',
            '2 coral auto',
            '3 coral auto',
            '4 coral auto',
            '5 coral auto',
            '1 processor auto',
            '2 processor auto',
            '1 reef algae removal auto',
            '2 reef algae removal auto',
            '1 barge auto',
            '2 barge auto',
            'Picked algae from ground',
            'Picked coral from ground',
            'Dropped coral while placing'
        ],
        tele: [
            'Takes a long time to line up for coral',
            'Processor only',
            'Coral only',
            'Barge only',
            'Held more than 1 coral',
            'Held more than 1 algae',
            'Extremely accurate coral',
            'Misses a lot of barge shots',
            'Game piece jammed in bot',
            'Often misses floor pick',
            "Steals from opponents' coral stations",
            'Takes a long time to set up barge shot',
            'Good defense',
            'Very fast floor pick',
            'Knocked algae out of reef',
            'Grabbed algae from reef',
            'Dropped coral while placing',
            'Picked algae from ground',
            'Picked coral from ground',
            'Damaged coral',
            'Damaged algae',
            'Climbed on top of algae',
            'Climbed on top of coral',
            'Drops coral at source'
        ],
        end: [
            'Climbs quickly',
            'Cannot climb',
            'Slow climb',
            'Unstable climb',
            'Tried to climb and failed',
            'Parked'
        ]
    }
};
