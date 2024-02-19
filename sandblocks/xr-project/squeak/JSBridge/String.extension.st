Extension { #name : #String }

{ #category : #'*jsbridge-core' }
String >> asJSArgument [
	"converted to JS string by plugin"
	self class isBytes ifTrue: [^self].
	^super asJSArgument

]
