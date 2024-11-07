Class {
	#name : #XRMock,
	#superclass : #Object,
	#instVars : [
		'mockedSelectors'
	],
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRMock >> doesNotUnderstand: aMessage [

	mockedSelectors at: aMessage selector
		ifPresent: [:block | | args |
			args := aMessage arguments.
			^ args size
				caseOf: {
					[0] -> [block value].
					[1] -> [block cull: args first].
					[2] -> [block cull: args first cull: args second].
					[3] -> [block cull: args first cull: args second cull: args third].
					[4] -> [block cull: args first cull: args second cull: args third cull: args fourth].
					[5] -> [block cull: args first cull: args second cull: args third cull: args fourth cull: args fifth]}
				otherwise: [block valueWithArguments: args]]
		ifAbsent: [^ super doesNotUnderstand: aMessage]
]

{ #category : #'as yet unclassified' }
XRMock >> initialize [

	super initialize.
	mockedSelectors := Dictionary new.
]

{ #category : #'as yet unclassified' }
XRMock >> mock_respondTo: aSelector with: aBlockOrObject [

	mockedSelectors at: aSelector put: (aBlockOrObject isBlock
		ifTrue: [aBlockOrObject]
		ifFalse: [[aBlockOrObject]])
]

{ #category : #'as yet unclassified' }
XRMock >> mock_understand: aSelectorOrCollection [

	aSelectorOrCollection isCollection ifTrue: [
		aSelectorOrCollection do: [:selector | self mock_understand: selector]].
	
	self mock_respondTo: aSelectorOrCollection with: nil
]
