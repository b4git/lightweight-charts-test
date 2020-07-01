import { createChart, BarData, PriceLineSource, BarPrices, UTCTimestamp, BusinessDay, LineStyle } from 'lightweight-charts';

const chart = createChart(document.body, {
    width: 1000, height: 600,

    layout: {
        backgroundColor: '#000000',
        textColor: 'rgba(255, 255, 255, 0.9)',
    },

    grid: {
        horzLines: {
            color: '#eee',
            visible: false,
        },
        vertLines: {
            color: '#ffffff',
            visible: false,
        },
    },

    crosshair: {
        horzLine: {
            visible: false,
            labelVisible: false
        },
        vertLine: {
            visible: true,
            style: LineStyle.Dashed,
            width: 1,
            color: 'white',
            labelVisible: false,
        }
    },

});
const lineSeries = chart.addCandlestickSeries();


let curr = [100, 100, 100, 100]; // o, h, l, c
let randWalkPrice = (pctLimit: number, newAgg: boolean) => {
    let openChngPct = -pctLimit + 2.00001 * pctLimit * Math.random();    // relative to prev close
    let closeChangePct = -pctLimit + 2.00001 * pctLimit * Math.random(); // -5 to +5 % change relative to prev close
    if (newAgg) {
        curr[0] = curr[3] + curr[3] * openChngPct; // o
        curr[3] = curr[3] + curr[3] * closeChangePct; // c
        curr[1] = Math.max(curr[0], curr[3]);
        curr[2] = Math.min(curr[0], curr[3]);
    } else { // if just animating current candle -- open doesn't need change
        curr[3] = curr[3] * (1 + closeChangePct); // close changes
        curr[1] = Math.max(curr[1], curr[3]); // h is max of prev h or new close
        curr[2] = Math.min(curr[2], curr[3]); // l is min of prev l or new close             
    }
    curr = curr.map(e => parseFloat(e.toFixed(2)));
    return curr;
}

let i = 0;
let j = -1;
let max_j = 10; // update single candle max_j times



const sma10 = chart.addLineSeries({ color: "lightseagreen" });
const sma20 = chart.addLineSeries({ color: "green" });
const sma50 = chart.addLineSeries({ color: "magenta" });
const sma100 = chart.addLineSeries({ color: "lightcyan" });

// ma1.setData([
//   { time: "2018-12-12", value: 24.11 },
//   { time: "2018-12-13", value: 31.74 }
// ]);

/** makes closure to enclose the moving window */
const baseMA = (period: number) => {
    let windowSum = 0;
    let priceWindow: number[] = [];

    /** new aggregation == newAgg */
    return (price: number, newAgg: boolean) => {
        // also need to account for the first incomplete candle -- very first candle cannot be inicomplete 
        if (!newAgg) {
            // don't push to priceWindow === don't change internals === simply calc and return
            let sum = windowSum;
            sum += price;
            if (priceWindow.length >= period) {
                sum -= priceWindow[0];
                return sum / priceWindow.length;
            }
            return sum / (priceWindow.length + 1); // +1 because 1 more price addeded than the actual window while the window has less than period elements

        } else {
            priceWindow.push(price);
            windowSum += price;
            if (priceWindow.length > period) {
                windowSum -= priceWindow.shift() as number;
            }
            return windowSum / priceWindow.length;
        }
    }
}

const calcMA10 = baseMA(10);
const calcMA20 = baseMA(20);
const calcMA50 = baseMA(50);
const calcMA100 = baseMA(100);

setInterval(() => {
    j = ++j % max_j;
    if (j == 0) {
        i++;
        randWalkPrice(0.01, true);
    } else {
        randWalkPrice(0.01, false);
    }
    let tm = new Date(Date.now() - (100 - i) * (24 * 60 * 60 * 1000)).toUTCString();
    let barData: BarData = { time: tm, open: curr[0], high: curr[1], low: curr[2], close: curr[3] };
    lineSeries.update(barData);
    sma10.update({ time: tm, value: calcMA10(curr[3], j == 0) });
    sma20.update({ time: tm, value: calcMA20(curr[3], j == 0) });
    sma50.update({ time: tm, value: calcMA50(curr[3], j == 0) });
    sma100.update({ time: tm, value: calcMA100(curr[3], j == 0) });
}, 500);



// 
// Legend
// 
document.body.style.position = 'relative';

let legend = document.createElement('div');
legend.classList.add('legend');

let chartHolder = document.getElementsByClassName("tv-lightweight-charts")[0];
chartHolder.appendChild(legend);

let firstRow = document.createElement('div');
firstRow.innerText = 'STOCK PRICE';
//firstRow.style.color = 'red';
legend.appendChild(firstRow);

function pad(n: number) {
    let s = ('0' + n);
    return s.substr(s.length - 2);
}

chart.subscribeCrosshairMove((param) => {
    let t = param.time as BusinessDay;
    if (t) {
        const price = param.seriesPrices.get(lineSeries) as BarPrices;
        firstRow.innerText = t.year + "-" + (t.month + "-").padStart(3, "0") + (t.day + " ").padStart(3, "0") +
            ("O:" + price.open.toFixed(2)).padEnd(10) +
            ("H:" + price.high.toFixed(2)).padEnd(10) +
            ("L:" + price.low.toFixed(2)).padEnd(10) +
            ("C:" + price.close.toFixed(2)).padEnd(10);
    }
    else {
        //firstRow.innerText = 'STOCK PRICE';
    }
});



// fullscreen handlers
const toggleButton = document.getElementById("toggleFS")!;
toggleButton.addEventListener("click", toggleFullscreen);
window.onkeypress = (ke: KeyboardEvent) => {
    toggleFullscreen();
}

window.onresize = () => {
}

function toggleFullscreen() {
    let elem = document.getElementsByClassName("tv-lightweight-charts")[0];

    if (!document.fullscreenElement) {

        chart.applyOptions({ width: window.screen.width, height: window.screen.height });
        elem.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
        
    elem.appendChild(toggleButton.parentElement?.removeChild(toggleButton)!);
    
    } else {
        chart.applyOptions({ width: 800, height: 600 });
        document.exitFullscreen();
        document.body.appendChild(elem.removeChild(toggleButton));
    }
}