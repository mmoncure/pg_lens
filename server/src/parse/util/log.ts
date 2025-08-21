class loggerClass {
    constructor() {
        this.toLog = undefined;
    }
    
    toLog?: boolean;
    
    setLog(toLog: boolean) {
        console.log('( logger ): Logger set with toLog:', toLog);
        this.toLog = toLog;
    }

    log(value: any) {
        if (this.toLog === true) {
            console.log(`( logger ): ${value}`);
        }
    }
}

const logger = new loggerClass();
export default logger