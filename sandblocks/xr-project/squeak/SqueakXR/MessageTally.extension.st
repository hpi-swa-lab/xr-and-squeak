Extension { #name : #MessageTally }

{ #category : #'*SqueakXR-helper' }
MessageTally class >> showReport: node [
	"Open a string holder with the reports from the given node"
	"(StringHolder new contents: 
		(String streamContents: [:s | node report: s ]))
			openLabel: 'Spy Results'"
	Transcript showln: (String streamContents: [:s | node report: s ])
]
