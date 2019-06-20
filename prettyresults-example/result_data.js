var ANALYSIS_RESULTS = {
    "results": [
        {
            "id": "root",
            "name": "Root result",
            "type": "ContainerResult",
            "data": {},
            "labels": [],
            "children": [
                "root.region",
                "root.channel",
                "root.channel-by-region"
            ]
        },
        {
            "id": "root.region",
            "name": "Region",
            "type": "ContainerResult",
            "data": {},
            "labels": [],
            "children": [
                "root.region.bar",
                "root.region.freqs"
            ]
        },
        {
            "id": "root.channel",
            "name": "Channel",
            "type": "ContainerResult",
            "data": {},
            "labels": [],
            "children": [
                "root.channel.bar",
                "root.channel.freqs"
            ]
        },
        {
            "id": "root.channel-by-region",
            "name": "Sales channel by region",
            "type": "ContainerResult",
            "data": {},
            "labels": [],
            "children": [
                "root.channel-by-region.freq",
                "root.channel-by-region.bar"
            ]
        },
        {
            "id": "root.region.bar",
            "name": "Frequency bar chart",
            "type": "FigureResult",
            "data": {
                "filename": "root.region.bar.jpg"
            },
            "labels": [],
            "children": []
        },
        {
            "id": "root.region.freqs",
            "name": "Frequency table",
            "type": "TableResult",
            "data": {
                "headings": [
                    "",
                    "Region"
                ],
                "rows": [
                    [
                        "Africa",
                        "36"
                    ],
                    [
                        "Europe",
                        "22"
                    ],
                    [
                        "Asia",
                        "11"
                    ],
                    [
                        "Australia and Oceania",
                        "11"
                    ],
                    [
                        "Middle East",
                        "10"
                    ],
                    [
                        "Central America",
                        "7"
                    ],
                    [
                        "North America",
                        "3"
                    ]
                ],
                "pre": "",
                "post": ""
            },
            "labels": [],
            "children": []
        },
        {
            "id": "root.channel.bar",
            "name": "Frequency bar chart",
            "type": "FigureResult",
            "data": {
                "filename": "root.channel.bar.jpg"
            },
            "labels": [],
            "children": []
        },
        {
            "id": "root.channel.freqs",
            "name": "Frequency table",
            "type": "TableResult",
            "data": {
                "headings": [
                    "",
                    "Sales Channel"
                ],
                "rows": [
                    [
                        "Online",
                        "56"
                    ],
                    [
                        "Offline",
                        "44"
                    ]
                ],
                "pre": "",
                "post": ""
            },
            "labels": [],
            "children": []
        },
        {
            "id": "root.channel-by-region.freq",
            "name": "Frequency table",
            "type": "TableResult",
            "data": {
                "headings": [
                    "Region/Sales Channel",
                    "Offline",
                    "Online"
                ],
                "rows": [
                    [
                        "Africa",
                        "17",
                        "19"
                    ],
                    [
                        "Asia",
                        "5",
                        "6"
                    ],
                    [
                        "Australia and Oceania",
                        "4",
                        "7"
                    ],
                    [
                        "Central America",
                        "4",
                        "3"
                    ],
                    [
                        "Europe",
                        "9",
                        "13"
                    ],
                    [
                        "Middle East",
                        "2",
                        "8"
                    ],
                    [
                        "North America",
                        "3",
                        "0"
                    ]
                ],
                "pre": "",
                "post": ""
            },
            "labels": [],
            "children": []
        },
        {
            "id": "root.channel-by-region.bar",
            "name": "Bar chart",
            "type": "FigureResult",
            "data": {
                "filename": "root.channel-by-region.bar.jpg"
            },
            "labels": [],
            "children": []
        }
    ],
    "root_result": "root"
}