/**
 * USSD Response Parser Service
 * Extracts structured data from raw USSD responses
 */

class UssdResponseParser {
    /**
     * Parse balance information from USSD response
     * Handles both USD (*379#) and ZWL (*171#) balance formats
     */
    parseBalance(rawResponse, currency = 'USD') {
        const result = {
            success: false,
            data: {},
            rawResponse
        };

        if (!rawResponse) {
            return result;
        }

        try {
            if (currency.toUpperCase() === 'USD') {
                return this._parseUSDBalance(rawResponse);
            } else if (currency.toUpperCase() === 'ZWL') {
                return this._parseZWLBalance(rawResponse);
            }
        } catch (error) {
            console.error('Error parsing balance:', error);
            result.error = error.message;
        }

        return result;
    }

    /**
     * Parse USD balance response
     * Expected format: "Your USD balance is $X.XX. Data: XMB"
     */
    _parseUSDBalance(rawResponse) {
        const result = {
            success: false,
            data: {},
            rawResponse
        };

        // Pattern: USD balance (various formats)
        const usdPatterns = [
            /USD\s*(?:balance|bal)?\s*(?:is)?\s*\$?\s*([\d,]+\.?\d*)/i,
            /\$\s*([\d,]+\.?\d*)\s*USD/i,
            /balance.*?\$\s*([\d,]+\.?\d*)/i
        ];

        for (const pattern of usdPatterns) {
            const match = rawResponse.match(pattern);
            if (match) {
                result.data.usdBalance = parseFloat(match[1].replace(/,/g, ''));
                result.success = true;
                break;
            }
        }

        // Pattern: Data balance
        const dataPatterns = [
            /Data[:\s]+([\d.]+)\s*(MB|GB|KB)/i,
            /([\d.]+)\s*(MB|GB|KB)\s*(?:data|remaining)/i
        ];

        for (const pattern of dataPatterns) {
            const match = rawResponse.match(pattern);
            if (match) {
                const amount = parseFloat(match[1]);
                const unit = match[2].toUpperCase();

                // Convert to MB for consistency
                let dataInMB = amount;
                if (unit === 'GB') dataInMB = amount * 1024;
                if (unit === 'KB') dataInMB = amount / 1024;

                result.data.dataBalance = dataInMB;
                result.data.dataBalanceFormatted = `${match[1]}${unit}`;
                result.success = true;
                break;
            }
        }

        return result;
    }

    /**
     * Parse ZWL balance response
     * Expected format: "Your ZWL balance is $X.XX" or "ZWL X.XX"
     */
    _parseZWLBalance(rawResponse) {
        const result = {
            success: false,
            data: {},
            rawResponse
        };

        // Pattern: ZWL balance
        const zwlPatterns = [
            /ZWL\s*(?:balance|bal)?\s*(?:is)?\s*\$?\s*([\d,]+\.?\d*)/i,
            /\$?\s*([\d,]+\.?\d*)\s*ZWL/i,
            /balance.*?ZWL\s*\$?\s*([\d,]+\.?\d*)/i
        ];

        for (const pattern of zwlPatterns) {
            const match = rawResponse.match(pattern);
            if (match) {
                result.data.zwlBalance = parseFloat(match[1].replace(/,/g, ''));
                result.success = true;
                break;
            }
        }

        // Pattern: Data balance (same as USD)
        const dataPatterns = [
            /Data[:\s]+([\d.]+)\s*(MB|GB|KB)/i,
            /([\d.]+)\s*(MB|GB|KB)\s*(?:data|remaining)/i
        ];

        for (const pattern of dataPatterns) {
            const match = rawResponse.match(pattern);
            if (match) {
                const amount = parseFloat(match[1]);
                const unit = match[2].toUpperCase();

                let dataInMB = amount;
                if (unit === 'GB') dataInMB = amount * 1024;
                if (unit === 'KB') dataInMB = amount / 1024;

                result.data.dataBalance = dataInMB;
                result.data.dataBalanceFormatted = `${match[1]}${unit}`;
                result.success = true;
                break;
            }
        }

        return result;
    }

    /**
     * Parse bundle purchase confirmation
     * Extracts transaction details from confirmation message
     */
    parsePurchaseConfirmation(rawResponse) {
        const result = {
            success: false,
            data: {},
            rawResponse
        };

        if (!rawResponse) {
            return result;
        }

        try {
            // Check for success indicators
            const successPatterns = [
                /success(?:ful)?(?:ly)?/i,
                /confirmed/i,
                /purchased/i,
                /activated/i,
                /transaction\s+complete/i
            ];

            const isSuccess = successPatterns.some(pattern => pattern.test(rawResponse));
            result.success = isSuccess;

            if (isSuccess) {
                // Extract transaction reference if present
                const refPatterns = [
                    /(?:ref|reference|transaction)(?:\s+(?:no|number|id))?[:\s]+([A-Z0-9]+)/i,
                    /([A-Z0-9]{8,})/  // Generic alphanumeric code
                ];

                for (const pattern of refPatterns) {
                    const match = rawResponse.match(pattern);
                    if (match) {
                        result.data.transactionRef = match[1];
                        break;
                    }
                }

                // Extract recipient if mentioned
                const recipientPattern = /(?:to|for)\s+(263\d{9}|\d{10})/i;
                const recipientMatch = rawResponse.match(recipientPattern);
                if (recipientMatch) {
                    result.data.recipient = recipientMatch[1];
                }

                // Extract bundle details if mentioned
                const bundlePattern = /([\d.]+\s*(?:MB|GB|minutes|mins|SMS))/i;
                const bundleMatch = rawResponse.match(bundlePattern);
                if (bundleMatch) {
                    result.data.bundleDetails = bundleMatch[1];
                }
            }
        } catch (error) {
            console.error('Error parsing purchase confirmation:', error);
            result.error = error.message;
        }

        return result;
    }

    /**
     * Parse error messages from USSD responses
     */
    parseError(rawResponse) {
        const result = {
            isError: false,
            errorType: null,
            errorMessage: null,
            rawResponse
        };

        if (!rawResponse) {
            return result;
        }

        const errorPatterns = [
            { pattern: /insufficient\s+(?:funds|balance)/i, type: 'INSUFFICIENT_FUNDS' },
            { pattern: /invalid\s+(?:number|recipient|phone)/i, type: 'INVALID_RECIPIENT' },
            { pattern: /failed/i, type: 'TRANSACTION_FAILED' },
            { pattern: /error/i, type: 'GENERAL_ERROR' },
            { pattern: /unavailable/i, type: 'SERVICE_UNAVAILABLE' },
            { pattern: /timeout/i, type: 'TIMEOUT' },
            { pattern: /cancelled/i, type: 'CANCELLED' }
        ];

        for (const { pattern, type } of errorPatterns) {
            if (pattern.test(rawResponse)) {
                result.isError = true;
                result.errorType = type;
                result.errorMessage = rawResponse.trim();
                break;
            }
        }

        return result;
    }

    /**
     * Main parser - determines response type and parses accordingly
     */
    parse(rawResponse, taskType, currency = 'USD') {
        const result = {
            success: false,
            type: taskType,
            data: {},
            rawResponse,
            timestamp: new Date().toISOString()
        };

        if (!rawResponse) {
            result.error = 'No response to parse';
            return result;
        }

        // First check for errors
        const errorCheck = this.parseError(rawResponse);
        if (errorCheck.isError) {
            result.success = false;
            result.error = errorCheck.errorMessage;
            result.errorType = errorCheck.errorType;
            return result;
        }

        // Parse based on task type
        try {
            switch (taskType) {
                case 'balance':
                    const balanceResult = this.parseBalance(rawResponse, currency);
                    result.success = balanceResult.success;
                    result.data = balanceResult.data;
                    if (balanceResult.error) result.error = balanceResult.error;
                    break;

                case 'data':
                case 'social_media':
                case 'sms':
                case 'combo':
                case 'voice':
                    const purchaseResult = this.parsePurchaseConfirmation(rawResponse);
                    result.success = purchaseResult.success;
                    result.data = purchaseResult.data;
                    if (purchaseResult.error) result.error = purchaseResult.error;
                    break;

                default:
                    result.success = true;
                    result.data.message = rawResponse.trim();
            }
        } catch (error) {
            console.error('Error in main parser:', error);
            result.success = false;
            result.error = error.message;
        }

        return result;
    }
}

module.exports = new UssdResponseParser();
