Extension { #name : #Object }

{ #category : #'*jsbridge-core' }
Object >> asJSArgument [
	self error: 'Cannot convert ', self class name, ' to JavaScript'.

]

{ #category : #'*jsbridge-core' }
Object >> asJSObject [
	"Only for debugging! Allows to pass a Squeak object to JavaScript without converting"
	^JSObjectProxy basicNew primSqueakAsJSObject: self

]
