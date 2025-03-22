(function() {
    console.log("Script loaded and executed!");

    const API_TOKEN = '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';

    async function analyzeNotesWithHuggingFace(notes) {
        const url = 'https://api-inference.huggingface.co/models/gpt2';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + API_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: 'Analyze these ESL student spoken notes (ignore spelling) and generate a detailed report focusing on Accuracy (Grammar), Clarity, Confidence, Expression, and Range with specific examples from: ' + notes,
                    parameters: { max_length: 500, temperature: 0.7 }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            if (!Array.isArray(data) || !data[0]?.generated_text) {
                throw new Error('API response is invalid or empty');
            }

            const apiText = data[0].generated_text || notes;
            return apiText.startsWith('Analyze these ESL student spoken notes') ? notes : apiText;
        } catch (error) {
            console.error('API Error Details:', error);
            alert(`API failed: ${error.message}. Falling back to local analysis.`);
            return notes;
        }
    }

    function extractStudentInfo(notes) {
        const firstLine = notes.split('\n')[0].trim();
        if (firstLine.includes(',') && firstLine.split(',').length === 2) {
            const [name, extra] = firstLine.split(',').map(s => s.trim());
            return { name, locationOrJob: extra };
        }
        return {
            name: document.querySelector('.grading-form .axis-ui-right span')?.innerText.trim().split(' ')[0] || 'Student',
            locationOrJob: ''
        };
    }

    function cleanExample(example) {
        example = example.replace(/\bi\b/g, 'I');
        if (!/[.!?]$/.test(example)) {
            example += '.';
        }
        example = example.charAt(0).toUpperCase() + example.slice(1);
        return example;
    }

    function analyzeGrammar(notes) {
        const grammarIssues = [];
        const lines = notes.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            let match = line.match(/\b(be|is|are|was|were)\b[^.]*ed\b/);
            if (match && !line.match(/\b(can|should|will|would)\b/)) {
                grammarIssues.push({
                    issue: 'subject-verb agreement',
                    example: cleanExample(match[0]),
                    correction: 'Add an auxiliary verb like "can" or "should" (e.g., "people who can be trusted").'
                });
            }
            match = line.match(/\b(a|an|the)\s+[^.]*\b(need|needs)\b/);
            if (match && line.match(/\bneed\b/) && !line.match(/\bneeds\b/)) {
                grammarIssues.push({
                    issue: 'subject-verb agreement',
                    example: cleanExample(match[0]),
                    correction: 'Use "needs" for singular subjects (e.g., "the colleague needs to have").'
                });
            }
            match = line.match(/\bthe\s+\w+\s+need\b/);
            if (match && line.match(/\b\w+s\s+need\b/)) {
                grammarIssues.push({
                    issue: 'subject-verb agreement',
                    example: cleanExample(match[0]),
                    correction: 'Use "need" for plural subjects (e.g., "team members need to collaborate").'
                });
            }
            match = line.match(/\b(i|we|they)\s+(like|want|need|go)\b/);
            if (match && !line.match(/\bto\b/)) {
                grammarIssues.push({
                    issue: 'verb form',
                    example: cleanExample(match[0]),
                    correction: 'Add "to" after verbs like "want" or "need" (e.g., "I want to go").'
                });
            }
            match = line.match(/\b(i|we|they)\s+\w+[^ed]\b/);
            if (match && line.match(/\b(i|we|they)\s+(like|want|need|go)\b/) && line.match(/\blast\b/)) {
                grammarIssues.push({
                    issue: 'past simple tense',
                    example: cleanExample(match[0]),
                    correction: 'Use past tense for past events (e.g., "I wanted to go last week").'
                });
            }
            match = line.match(/\bis\b[^.]*\b(need|needs)\b/);
            if (match && !line.match(/\bthe\b/)) {
                grammarIssues.push({
                    issue: 'article usage',
                    example: cleanExample(match[0]),
                    correction: 'Add an article like "the" (e.g., "is the need to hire").'
                });
            }
            match = line.match(/\bthe\s+(innovation|collaboration|integrity|teamwork|diversity)\b/);
            if (match) {
                grammarIssues.push({
                    issue: 'article usage',
                    example: cleanExample(match[0]),
                    correction: 'Omit "the" for abstract nouns (e.g., "to have innovation").'
                });
            }
            match = line.match(/[^.]*\b(structure|idea|value|team)\b[^.]*\1\b/);
            if (match) {
                grammarIssues.push({
                    issue: 'repetition',
                    example: cleanExample(match[0]),
                    correction: 'Avoid repetition by rephrasing (e.g., "A horizontal structure is better for teamwork.").'
                });
            }
            if (line.match(/\bgoing\s+out\s+their\s+decision\b/)) {
                grammarIssues.push({
                    issue: 'preposition error',
                    example: cleanExample('going out their decision'),
                    correction: 'Use "making their decision" instead.'
                });
            }
            match = line.match(/[^.?!]{50,}/);
            if (match) {
                grammarIssues.push({
                    issue: 'run-on sentence',
                    example: cleanExample(match[0].substring(0, 50) + '...'),
                    correction: 'Break into shorter sentences (e.g., "We need diversity. Hire more regional people.").'
                });
            }
        });
        return grammarIssues.length > 0 ? grammarIssues.slice(0, 2) : [{
            issue: 'general grammar',
            example: 'your speech',
            correction: 'Focus on using correct verb forms, articles, and sentence structure.'
        }];
    }

    function analyzeContent(notes) {
        const stopWords = ['with', 'you', 'the', 'and', 'for', 'that', 'this', 'have', 'need', 'their', 'they', 'all', 'can', 'more', 'not', 'one', 'out', 'work', 'team', 'want', 'like', 'make', 'good', 'should', 'people', 'hire', 'job', 'stay', 'last', 'hope', 'allow', 'thing', 'member', 'together', 'better', 'discussion', 'before', 'going', 'decision', 'region', 'working', 'hour', 'flexible', 'remote', 'office', 'factory', 'number', 'second', 'third'];
        const lines = notes.split('\n').filter(line => line.trim() && !(line.includes(',') && line.split(',').length === 2));
        const words = lines.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.includes(w));
        const keyPhrases = words.reduce((acc, word) => (acc[word] = (acc[word] || 0) + 1, acc), {});
        const topPhrases = Object.entries(keyPhrases).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([phrase]) => phrase);
        return {
            isFreeChat: words.length <= 3,
            contentTopic: topPhrases.length ? topPhrases.join(', ') : 'General Conversation',
            keyPhrases: topPhrases
        };
    }

    function truncateToCompletePhrase(line, minLength = 20, maxLength = 100) {
        if (line.length <= maxLength) return line;
        let endIndex = maxLength;
        while (endIndex > minLength && line[endIndex] !== ' ' && line[endIndex] !== '.' && line[endIndex] !== ',') {
            endIndex--;
        }
        if (endIndex <= minLength) return line.substring(0, minLength) + '...';
        return line.substring(0, endIndex) + '...';
    }

    function extractStrengths(notes, keyPhrases) {
        const lines = notes.split('\n').filter(line => line.trim());
        const usedExamples = new Set();
        let accuracyStrengths = [];
        let clarityStrengths = [];
        let confidenceStrengths = [];
        let expressionStrengths = [];
        let rangeStrengths = [];
        lines.forEach(line => {
            if (accuracyStrengths.length < 2 && line.match(/\b(is|are|was|were)\b[^.]*\b(a|an|the)\b/) && !line.match(/\b(be|is|are|was|were)\b[^.]*ed\b/) && !line.match(/\bneed\b/) && !line.match(/\bthe\s+(innovation|collaboration|integrity|teamwork|diversity)\b/)) {
                const example = cleanExample(truncateToCompletePhrase(line));
                if (!usedExamples.has(example)) {
                    accuracyStrengths.push(example);
                    usedExamples.add(example);
                }
            }
            if (clarityStrengths.length < 2 && line.length > 20 && line.match(/\b(so|because|since)\b/) && !line.match(/\bneed\b/)) {
                const example = cleanExample(truncateToCompletePhrase(line));
                if (!usedExamples.has(example)) {
                    clarityStrengths.push(example);
                    usedExamples.add(example);
                }
            }
            if (confidenceStrengths.length < 2 && line.match(/\b(i|we)\s+(think|believe|hope|know)\b/)) {
                const example = cleanExample(truncateToCompletePhrase(line));
                if (!usedExamples.has(example)) {
                    confidenceStrengths.push(example);
                    usedExamples.add(example);
                }
            }
            if (expressionStrengths.length < 2 && keyPhrases.some(phrase => line.toLowerCase().includes(phrase)) && line.match(/\b(integrity|innovation|collaboration|structure|diversity)\b/)) {
                const example = cleanExample(truncateToCompletePhrase(line));
                if (!usedExamples.has(example)) {
                    expressionStrengths.push(example);
                    usedExamples.add(example);
                }
            }
            if (rangeStrengths.length < 2 && line.match(/\b(but|however|also|because)\b/) && line.length > 20) {
                const example = cleanExample(truncateToCompletePhrase(line));
                if (!usedExamples.has(example)) {
                    rangeStrengths.push(example);
                    usedExamples.add(example);
                }
            }
        });
        return {
            accuracyStrengths: accuracyStrengths.length > 0 ? accuracyStrengths : null,
            clarityStrengths: clarityStrengths.length > 0 ? clarityStrengths : null,
            confidenceStrengths: confidenceStrengths.length > 0 ? confidenceStrengths : null,
            expressionStrengths: expressionStrengths.length > 0 ? expressionStrengths : null,
            rangeStrengths: rangeStrengths.length > 0 ? rangeStrengths : null
        };
    }

    function generateReport(notes, studentName, locationOrJob) {
        const { isFreeChat, contentTopic, keyPhrases } = analyzeContent(notes);
        const grammarIssues = analyzeGrammar(notes);
        const strengths = extractStrengths(notes, keyPhrases);
        const firstName = studentName.split(' ')[0];
        const examplePhrase = keyPhrases[0] || 'your ideas';
        const secondaryPhrase = keyPhrases[1] || 'thoughts';
        const accuracyScore = isFreeChat ? 85 : 80;
        const grammarIssue = grammarIssues[0];
        const secondaryGrammarIssue = grammarIssues.length > 1 ? grammarIssues[1] : null;

        return {
            sections: {
                accuracy: {
                    score: accuracyScore,
                    strengths: strengths.accuracyStrengths ? `${firstName}, you used correct grammar in several areas. For example, you said "${strengths.accuracyStrengths[0]}" which shows proper verb and article usage. ${strengths.accuracyStrengths[1] ? `Another good example is "${strengths.accuracyStrengths[1]}" where you maintained grammatical accuracy.` : 'You consistently used correct forms in similar sentences.'} Keep practicing to maintain this level of accuracy across all your speech.` : `${firstName}, you used correct grammar in some of your sentences, but more examples of accurate grammar would strengthen your speech. Try focusing on proper verb forms and article usage in your sentences to build consistency.`,
                    improvement: `You had an issue with ${grammarIssue.issue}. For example, you said "${grammarIssue.example}". Instead, ${grammarIssue.correction} ${secondaryGrammarIssue ? `Another instance is "${secondaryGrammarIssue.example}", where you should ${secondaryGrammarIssue.correction}` : 'To improve, practice using correct verb forms in sentences like "The team is working" versus "The team are working."'} You can enhance your grammar by reviewing subject-verb agreement rules and practicing with exercises on auxiliary verbs. Try writing short sentences daily to reinforce these concepts.`
                },
                clarity: {
                    score: 85,
                    strengths: strengths.clarityStrengths ? `${firstName}, you explained your ideas clearly in multiple instances. For example, "${strengths.clarityStrengths[0]}" shows a clear cause-effect relationship. ${strengths.clarityStrengths[1] ? `Similarly, "${strengths.clarityStrengths[1]}" makes your point easy to follow.` : 'Your use of connectors like "so" helps your audience understand your ideas.'} Continue using such structures to maintain clarity in your speech.` : `${firstName}, your ideas were generally easy to follow, but adding more connectors like "because" or "so" can improve clarity. Try explaining your ideas with clear cause-effect relationships to make your points more understandable.`,
                    improvement: `Try pausing after key ideas like "${examplePhrase}" to enhance comprehension. For example, after saying "${examplePhrase}", take a brief pause to let your audience process the idea. Additionally, avoid long sentences like "${notes.split('\n').find(line => line.length > 50) || 'your longer sentences'}", which can confuse listeners. Break them into shorter, clearer statements. Practice speaking slowly and organizing your thoughts before speaking to improve overall clarity.`
                },
                confidence: {
                    score: 85,
                    strengths: strengths.confidenceStrengths ? `${firstName}, you spoke confidently in several moments. For instance, "${strengths.confidenceStrengths[0]}" shows a strong, assertive tone. ${strengths.confidenceStrengths[1] ? `Another example, "${strengths.confidenceStrengths[1]}", also reflects your confidence in expressing your thoughts.` : 'Your use of phrases like "I hope" or "I believe" adds conviction to your speech.'} Keep using such assertive language to engage your audience effectively.` : `${firstName}, your tone was generally steady, but you can boost your confidence by using more assertive phrases like "I believe" or "I know." Practice speaking with a firm tone to convey your ideas more convincingly.`,
                    improvement: `Expand on ${secondaryPhrase} with details, e.g., "${secondaryPhrase} matters because it drives progress." For example, if discussing "${secondaryPhrase}", explain why it’s important with specific reasons or examples. This will make your speech more engaging. Additionally, try maintaining eye contact and using a steady tone when speaking to project more confidence. Record yourself speaking and review to identify areas where you can sound more assertive.`
                },
                expression: {
                    score: 85,
                    strengths: strengths.expressionStrengths ? `${firstName}, you expressed yourself well with vivid language. For example, "${strengths.expressionStrengths[0]}" effectively conveys your perspective using a key idea. ${strengths.expressionStrengths[1] ? `Another strong example is "${strengths.expressionStrengths[1]}", which adds depth to your speech.` : 'Your use of specific terms makes your ideas more engaging.'} Continue using descriptive words to make your speech more impactful.` : `${firstName}, your ideas were generally well conveyed, but using more vivid language can enhance your expression. Try incorporating descriptive words like "innovative" or "collaborative" to make your speech more engaging.`,
                    improvement: `Incorporate vivid terms like "integrity" or "innovation" related to ${contentTopic}. For instance, instead of saying "we need to work together," say "we need to foster collaboration to succeed." Also, use more adjectives or adverbs, such as "highly innovative" or "effectively collaborative," to add depth. Practice describing your ideas with more detail in daily conversations to improve your expressive skills over time.`
                },
                range: {
                    score: 85,
                    strengths: strengths.rangeStrengths ? `${firstName}, you showed variety in your language across your speech. For example, "${strengths.rangeStrengths[0]}" uses a connector to add variety to your sentence structure. ${strengths.rangeStrengths[1] ? `Similarly, "${strengths.rangeStrengths[1]}" demonstrates your ability to vary your phrasing.` : 'Your use of connectors like "because" or "also" adds diversity to your speech.'} Keep experimenting with different sentence structures to maintain this variety.` : `${firstName}, your language showed some variety in your sentence structures, but you can enhance it further by using more connectors like "however" or "also." Try varying your sentence length and structure to make your speech more dynamic.`,
                    improvement: `Add specific vocabulary like "collaboration" or "motivation" to enrich ${contentTopic}. For example, instead of saying "we need to work together," say "we need to build collaboration to achieve success."`
                }
            }
        };
    }
})();
